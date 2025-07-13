import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserFromJwt } from '../auth/jwt.strategy';
import { SubmitOfflineSubmissionsDto } from './offline-submission.schema';
import {
  AnswerData,
  AnswersMap,
  canonicalizeAnswers,
} from '@one-exam-monorepo/utils';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as yauzl from 'yauzl';

interface Question {
  id: string;
  points: number;
  // Add other question properties as needed
}

interface SubmissionFileContent {
  submissionId: string;
  encryptedSealedAnswers: string;
  encryptedSubmissionKey: string;
  sessionId?: string;
  savedAt: string;
  metadata?: {
    examId: string;
    studentId: string;
    clientVersion?: string;
  };
}

interface SubmissionManifest {
  examId: string;
  sessionId?: string;
  studentId: string;
  totalSubmissions: number;
  submissions: Array<{
    submissionId: string;
    filename: string;
    savedAt: string;
    sessionId?: string;
  }>;
  createdAt: string;
}

interface ExamWithQuestions {
  id: string;
  questions: Question[];
  // Add other exam properties as needed
}

interface DecryptedSubmission {
  submissionId: string;
  sessionId?: string;
  savedAt: string;
  examId: string;
  studentId: string;
  answers: AnswersMap;
  finalAnswersHash: string;
  sealingTimestamp: string;
}

interface CheatDetectionResult {
  suspiciousLevel: number; // 0-100
  detectedAnomalies: string[];
}

@Injectable()
export class OfflineSubmissionService {
  private readonly logger = new Logger(OfflineSubmissionService.name);
  private readonly RSA_PRIVATE_KEY: string;

  constructor(private readonly prismaService: PrismaService) {
    // Load RSA private key from environment or file
    this.RSA_PRIVATE_KEY = this.loadPrivateKey();

    // Verify that the key pair works
    this.verifyKeyPair();
  }

  /**
   * Load RSA private key from environment or file system
   */
  private loadPrivateKey(): string {
    try {
      // First try to load from environment variable
      if (process.env.RSA_PRIVATE_KEY) {
        return process.env.RSA_PRIVATE_KEY;
      }

      // Try multiple possible paths for the private key
      const possiblePaths = [
        // Relative to this service file (development)
        path.join(__dirname, '..', '..', 'keys', 'private.pem'),
        // Relative to process.cwd() (runtime)
        path.join(process.cwd(), 'keys', 'private.pem'),
        path.join(
          process.cwd(),
          'apps',
          'core-backend',
          'src',
          'keys',
          'private.pem'
        ),
        // Absolute path based on current location
        path.resolve(__dirname, '..', '..', 'keys', 'private.pem'),
      ];

      // Debug: Log the environment info
      this.logger.debug('RSA Key Loading Debug Info:');
      this.logger.debug(`__dirname: ${__dirname}`);
      this.logger.debug(`process.cwd(): ${process.cwd()}`);
      this.logger.debug(
        `Possible paths: ${JSON.stringify(possiblePaths, null, 2)}`
      );

      for (const keyPath of possiblePaths) {
        try {
          this.logger.debug(`Checking path: ${keyPath}`);
          if (fs.existsSync(keyPath)) {
            const privateKey = fs.readFileSync(keyPath, 'utf8');
            this.logger.log(`Successfully loaded private key from: ${keyPath}`);
            this.logger.debug(
              `Key starts with: ${privateKey.substring(0, 50)}`
            );
            this.logger.debug(`Key length: ${privateKey.length}`);
            return privateKey;
          }
        } catch (pathError) {
          this.logger.debug(`Failed to load key from ${keyPath}:`, pathError);
        }
      }

      throw new Error(
        `Private key not found in any of the expected locations: ${possiblePaths.join(
          ', '
        )}`
      );
    } catch (error) {
      this.logger.error('Failed to load RSA private key:', error);
      throw new Error('RSA private key not configured');
    }
  }

  /**
   * Decrypt submission key using RSA private key
   */
  private decryptSubmissionKey(encryptedKey: string): Buffer {
    try {
      this.logger.debug(
        `Attempting to decrypt submission key. ${encryptedKey}`
      );
      this.logger.debug(`Private key: ${this.RSA_PRIVATE_KEY}`);

      const buffer = Buffer.from(encryptedKey, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: this.RSA_PRIVATE_KEY,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer
      );

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt submission key: ${error.message}`);
    }
  }

  /**
   * Decrypt sealed answers using submission key
   */
  private decryptSealedAnswers(
    encryptedData: string,
    submissionKey: Buffer
  ): DecryptedSubmission {
    try {
      const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');

      if (!ivHex || !encryptedHex || !authTagHex) {
        throw new Error('Invalid encrypted data format');
      }

      // Client uses hex format, not base64
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      this.logger.debug(
        `Decrypting sealed answers - IV length: ${iv.length}, encrypted length: ${encrypted.length}, authTag length: ${authTag.length}, key length: ${submissionKey.length}`
      );

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        submissionKey,
        iv
      );
      decipher.setAuthTag(authTag);

      const decryptedChunks: Buffer[] = [];
      decryptedChunks.push(decipher.update(encrypted));
      decryptedChunks.push(decipher.final());

      const decryptedData = Buffer.concat(decryptedChunks).toString('utf8');
      return JSON.parse(decryptedData);
    } catch (error) {
      this.logger.error('Failed to decrypt sealed answers:', error.message);
      throw new Error(`Failed to decrypt sealed answers: ${error.message}`);
    }
  }

  /**
   * Verify answer hash integrity
   */
  private verifyAnswerHash(answers: AnswersMap, expectedHash: string): boolean {
    try {
      // Canonicalize answers (same logic as client)
      const canonicalAnswers = canonicalizeAnswers(answers);
      const hash = crypto
        .createHash('sha256')
        .update(canonicalAnswers)
        .digest('hex');
      return hash === expectedHash;
    } catch (error) {
      this.logger.warn('Failed to verify answer hash:', error);
      return false;
    }
  }

  /**
   * Analyze submissions for cheat detection
   */
  private analyzeSubmissionsForCheating(
    submissions: DecryptedSubmission[]
  ): CheatDetectionResult {
    const anomalies: string[] = [];
    let suspiciousLevel = 0;

    // Sort submissions by timestamp
    const sortedSubmissions = submissions.sort(
      (a, b) =>
        new Date(a.sealingTimestamp).getTime() -
        new Date(b.sealingTimestamp).getTime()
    );

    // 1. Verify answer hash for each submission
    for (const submission of sortedSubmissions) {
      if (
        !this.verifyAnswerHash(submission.answers, submission.finalAnswersHash)
      ) {
        anomalies.push('Answer hash verification failed');
        suspiciousLevel += 30;
      }
    }

    // 2. Check timestamp integrity
    for (let i = 1; i < sortedSubmissions.length; i++) {
      const prev = new Date(sortedSubmissions[i - 1].sealingTimestamp);
      const curr = new Date(sortedSubmissions[i].sealingTimestamp);
      const diff = curr.getTime() - prev.getTime();

      // Check for suspicious timing patterns
      if (diff < 0) {
        anomalies.push('Timestamp manipulation detected');
        suspiciousLevel += 25;
      } else if (diff > 30 * 60 * 1000) {
        // More than 30 minutes gap
        anomalies.push('Long period with no changes detected');
        suspiciousLevel += 10;
      }
    }

    // 3. Analyze mass changes
    if (sortedSubmissions.length >= 2) {
      for (let i = 1; i < sortedSubmissions.length; i++) {
        const prev = sortedSubmissions[i - 1];
        const curr = sortedSubmissions[i];

        const changedAnswers = this.countChangedAnswers(
          prev.answers,
          curr.answers
        );
        const totalAnswers = Object.keys(curr.answers).length;
        const changePercentage =
          totalAnswers > 0 ? (changedAnswers / totalAnswers) * 100 : 0;

        // Check for mass changes
        if (changePercentage > 50) {
          anomalies.push('Mass answer changes detected');
          suspiciousLevel += 15;
        }

        // Check for mass changes in short time
        const timeDiff =
          new Date(curr.sealingTimestamp).getTime() -
          new Date(prev.sealingTimestamp).getTime();
        if (timeDiff < 2 * 60 * 1000 && changePercentage > 30) {
          // Less than 2 minutes, 30%+ changes
          anomalies.push('Mass changes in short time detected');
          suspiciousLevel += 20;
        }
      }
    }

    // 4. Check for irregular submission intervals
    if (sortedSubmissions.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < sortedSubmissions.length; i++) {
        const prev = new Date(sortedSubmissions[i - 1].sealingTimestamp);
        const curr = new Date(sortedSubmissions[i].sealingTimestamp);
        intervals.push(curr.getTime() - prev.getTime());
      }

      // Check for significantly longer intervals than auto-save (30 seconds)
      const longIntervals = intervals.filter(
        (interval) => interval > 35 * 1000
      ); // 35 seconds threshold
      if (longIntervals.length > intervals.length * 0.3) {
        anomalies.push('Irregular auto-save intervals detected');
        suspiciousLevel += 10;
      }
    }

    // 5. Check for periods with no changes
    if (sortedSubmissions.length >= 2) {
      const unchangedPeriods = this.findUnchangedPeriods(sortedSubmissions);
      if (unchangedPeriods > 3) {
        anomalies.push('Long periods with no changes detected');
        suspiciousLevel += 5;
      }
    }

    return {
      suspiciousLevel: Math.min(suspiciousLevel, 100),
      detectedAnomalies: [...new Set(anomalies)], // Remove duplicates
    };
  }

  /**
   * Count changed answers between two submissions
   */
  private countChangedAnswers(prev: AnswersMap, curr: AnswersMap): number {
    let changes = 0;
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

    for (const key of allKeys) {
      const prevAnswer = prev[key]?.answer;
      const currAnswer = curr[key]?.answer;

      if (JSON.stringify(prevAnswer) !== JSON.stringify(currAnswer)) {
        changes++;
      }
    }

    return changes;
  }

  /**
   * Find periods with no changes
   */
  private findUnchangedPeriods(submissions: DecryptedSubmission[]): number {
    let unchangedPeriods = 0;

    for (let i = 1; i < submissions.length; i++) {
      const prev = submissions[i - 1];
      const curr = submissions[i];

      if (this.countChangedAnswers(prev.answers, curr.answers) === 0) {
        unchangedPeriods++;
      }
    }

    return unchangedPeriods;
  }

  /**
   * Combine multiple submissions into final answers
   */
  private combineSubmissions(submissions: DecryptedSubmission[]): AnswersMap {
    // Use the latest submission as the base, but could implement more sophisticated merging logic
    const latestSubmission = submissions.sort(
      (a, b) =>
        new Date(b.sealingTimestamp).getTime() -
        new Date(a.sealingTimestamp).getTime()
    )[0];

    return latestSubmission.answers;
  }

  /**
   * Extract and parse submissions from zip file
   */
  private async extractSubmissionsFromZip(zipBuffer: Buffer): Promise<{
    submissions: SubmissionFileContent[];
    manifest?: SubmissionManifest;
  }> {
    return new Promise((resolve, reject) => {
      const submissions: SubmissionFileContent[] = [];
      let manifest: SubmissionManifest | null = null;

      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new BadRequestException('Invalid zip file'));
          return;
        }

        if (!zipfile) {
          reject(new BadRequestException('Failed to read zip file'));
          return;
        }

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;

          // Skip directories
          if (/\/$/.test(fileName)) {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(new BadRequestException(`Failed to read ${fileName}`));
              return;
            }

            if (!readStream) {
              zipfile.readEntry();
              return;
            }

            const chunks: Buffer[] = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', () => {
              try {
                const content = Buffer.concat(chunks).toString('utf8');
                const jsonData = JSON.parse(content);

                if (fileName === 'manifest.json') {
                  manifest = jsonData;
                } else if (fileName.endsWith('.json')) {
                  // Individual submission file
                  submissions.push(jsonData);
                }
              } catch (parseErr) {
                this.logger.warn(`Failed to parse ${fileName}:`, parseErr);
              }

              zipfile.readEntry();
            });

            readStream.on('error', () => {
              reject(
                new BadRequestException(`Failed to read stream for ${fileName}`)
              );
            });
          });
        });

        zipfile.on('end', () => {
          resolve({ submissions, manifest: manifest || undefined });
        });

        zipfile.on('error', () => {
          reject(new BadRequestException('Error reading zip file'));
        });
      });
    });
  }

  /**
   * Main method to process offline submissions from zip file
   */
  async processOfflineSubmissionsFromZip(
    user: UserFromJwt,
    dto: SubmitOfflineSubmissionsDto,
    zipBuffer: Buffer
  ) {
    try {
      this.logger.log(
        `Processing offline submissions zip for user ${user.userId}`
      );

      // Extract submissions from zip
      const { submissions: rawSubmissions } =
        await this.extractSubmissionsFromZip(zipBuffer);

      if (rawSubmissions.length === 0) {
        throw new BadRequestException('No valid submissions found in zip file');
      }

      this.logger.log(
        `Extracted ${rawSubmissions.length} submissions from zip`
      );

      // Verify exam exists and user has access
      const exam = await this.prismaService.exam.findFirst({
        where: {
          OR: [{ id: dto.examId }, { examCode: dto.examCode }],
          status: 'PUBLISHED',
        },
        include: {
          questions: true,
        },
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Check if user is enrolled
      const enrollment = await this.prismaService.user.findFirst({
        where: {
          id: user.userId,
          exams: {
            some: {
              id: exam.id,
            },
          },
        },
      });

      if (!enrollment) {
        throw new BadRequestException('User not enrolled in this exam');
      }

      // Decrypt all submissions
      const decryptedSubmissions: DecryptedSubmission[] = [];

      this.logger.log(`About to process ${rawSubmissions.length} submissions`);

      for (const submission of rawSubmissions) {
        try {
          this.logger.debug(`Processing submission ${submission.submissionId}`);
          this.logger.debug(
            `Encrypted key length: ${
              submission.encryptedSubmissionKey?.length || 'undefined'
            }`
          );
          this.logger.debug(
            `Encrypted data length: ${
              submission.encryptedSealedAnswers?.length || 'undefined'
            }`
          );

          // Log first few characters of encrypted key for debugging
          this.logger.debug(
            `Encrypted key starts with: ${submission.encryptedSubmissionKey?.substring(
              0,
              20
            )}...`
          );

          const submissionKey = this.decryptSubmissionKey(
            submission.encryptedSubmissionKey
          );

          this.logger.debug(
            `Successfully decrypted submission key for ${submission.submissionId}`
          );

          const decryptedData = this.decryptSealedAnswers(
            submission.encryptedSealedAnswers,
            submissionKey
          );

          // Add metadata from the submission
          decryptedData.submissionId = submission.submissionId;
          decryptedData.sessionId = submission.sessionId;
          decryptedData.savedAt = submission.savedAt;

          decryptedSubmissions.push(decryptedData);
          this.logger.debug(
            `Successfully processed submission ${submission.submissionId}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to decrypt submission ${submission.submissionId}:`,
            error
          );

          // Log additional debugging info for failed submissions
          this.logger.debug('Failed submission details:', {
            submissionId: submission.submissionId,
            encryptedKeyLength: submission.encryptedSubmissionKey?.length,
            encryptedDataLength: submission.encryptedSealedAnswers?.length,
            savedAt: submission.savedAt,
          });

          // Continue with other submissions
        }
      }

      if (decryptedSubmissions.length === 0) {
        throw new BadRequestException(
          'No valid submissions could be decrypted'
        );
      }

      // Continue with the same logic as the original method
      return this.processDecryptedSubmissions(
        user,
        dto,
        exam,
        decryptedSubmissions
      );
    } catch (error) {
      this.logger.error(
        'Failed to process offline submissions from zip:',
        error
      );
      throw error;
    }
  }

  /**
   * Common method to process decrypted submissions (extracted from original method)
   */
  private async processDecryptedSubmissions(
    user: UserFromJwt,
    dto: SubmitOfflineSubmissionsDto,
    exam: ExamWithQuestions,
    decryptedSubmissions: DecryptedSubmission[]
  ) {
    // Analyze for cheating
    const cheatAnalysis =
      this.analyzeSubmissionsForCheating(decryptedSubmissions);

    // Combine submissions into final answers
    const finalAnswers = this.combineSubmissions(decryptedSubmissions);

    // Get or create exam session
    const examStartTime = new Date(dto.examStartTime);
    let session = await this.prismaService.examSession.findUnique({
      where: {
        examId_userId: {
          examId: exam.id,
          userId: user.userId,
        },
      },
    });

    if (!session) {
      session = await this.prismaService.examSession.create({
        data: {
          examId: exam.id,
          userId: user.userId,
          startTime: examStartTime,
          endTime: new Date(dto.examEndTime),
          status: 'COMPLETED',
        },
      });
    } else {
      // Update session if needed
      session = await this.prismaService.examSession.update({
        where: { id: session.id },
        data: {
          endTime: new Date(dto.examEndTime),
          status: 'COMPLETED',
        },
      });
    }

    // Calculate score (basic implementation)
    const score = this.calculateScore(finalAnswers, exam.questions);

    // Update session with score
    await this.prismaService.examSession.update({
      where: { id: session.id },
      data: { score },
    });

    // Create submission record
    const submissionRecord = await this.prismaService.examSubmission.create({
      data: {
        sessionId: session.id,
        finalAnswers: JSON.stringify(finalAnswers),
        suspiciousLevel: cheatAnalysis.suspiciousLevel,
        detectedAnomalies: JSON.stringify(cheatAnalysis.detectedAnomalies),
        submissionsCount: decryptedSubmissions.length,
        submittedAt: new Date(dto.examEndTime),
      },
    });

    // Create individual answers for the session
    for (const answerData of Object.values(finalAnswers)) {
      const questionId = answerData.questionId.toString();

      await this.prismaService.examAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId: questionId,
          },
        },
        update: {
          answer: answerData.answer,
          submittedAt: new Date(),
        },
        create: {
          sessionId: session.id,
          questionId: questionId,
          answer: answerData.answer,
          submittedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Successfully processed submissions for session ${session.id} with ${cheatAnalysis.suspiciousLevel}% suspicious level`
    );

    return {
      sessionId: session.id,
      submissionId: submissionRecord.id,
      score,
      suspiciousLevel: cheatAnalysis.suspiciousLevel,
      detectedAnomalies: cheatAnalysis.detectedAnomalies,
      submissionsProcessed: decryptedSubmissions.length,
      message: 'Submissions processed successfully',
    };
  }

  /**
   * Basic score calculation
   */
  private calculateScore(answers: AnswersMap, questions: Question[]): number {
    let earnedPoints = 0;
    let totalPoints = 0;

    for (const question of questions) {
      totalPoints += question.points || 1;

      // Find corresponding answer
      const answer = Object.values(answers).find(
        (a: AnswerData) => a.questionId === parseInt(question.id)
      );

      if (answer) {
        // Basic scoring - this can be enhanced based on question types
        if (this.evaluateAnswer(answer.answer)) {
          earnedPoints += question.points || 1;
        }
      }
    }

    return totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  }

  /**
   * Basic answer evaluation - to be enhanced based on question types
   */
  private evaluateAnswer(studentAnswer: string | number | number[]): boolean {
    // This is a placeholder - implement proper answer evaluation based on question types
    // For now, we'll just check if an answer was provided
    return (
      studentAnswer !== null &&
      studentAnswer !== undefined &&
      studentAnswer !== ''
    );
  }

  /**
   * Get submission analysis for a specific session
   */
  async getSubmissionAnalysis(user: UserFromJwt, sessionId: string) {
    try {
      // Find the submission record for this session
      const submission = await this.prismaService.examSubmission.findFirst({
        where: {
          sessionId: sessionId,
          session: {
            userId: user.userId, // Ensure user owns this session
          },
        },
        include: {
          session: {
            include: {
              exam: true,
              user: true,
            },
          },
        },
      });

      if (!submission) {
        throw new NotFoundException('Submission analysis not found');
      }

      return {
        submissionId: submission.id,
        sessionId: submission.sessionId,
        examTitle: submission.session.exam.title,
        score: submission.session.score,
        suspiciousLevel: submission.suspiciousLevel,
        detectedAnomalies: JSON.parse(submission.detectedAnomalies as string),
        submissionsCount: submission.submissionsCount,
        submittedAt: submission.submittedAt,
        analyzedAt: submission.analyzedAt,
      };
    } catch (error) {
      this.logger.error('Failed to get submission analysis:', error);
      throw error;
    }
  }

  /**
   * Verify that the private key can decrypt data encrypted with the corresponding public key
   */
  private verifyKeyPair(): boolean {
    try {
      // Load the public key
      const publicKeyPath = path.resolve(
        __dirname,
        '..',
        '..',
        'keys',
        'public.pem'
      );
      if (!fs.existsSync(publicKeyPath)) {
        this.logger.warn('Public key not found for verification');
        return false;
      }

      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

      // Test data
      const testData = 'test-encryption-data';

      // Encrypt with public key using the same settings as the client
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(testData, 'utf8')
      );

      // Try to decrypt with private key
      const decrypted = crypto.privateDecrypt(
        {
          key: this.RSA_PRIVATE_KEY,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encrypted
      );

      const result = decrypted.toString('utf8') === testData;
      this.logger.log(
        `RSA key pair verification: ${result ? 'SUCCESS' : 'FAILED'}`
      );
      return result;
    } catch (error) {
      this.logger.error('RSA key pair verification failed:', error.message);
      return false;
    }
  }

  /**
   * Log public key information for debugging
   */
  private logPublicKeyInfo(): void {
    try {
      const publicKeyPath = path.resolve(
        __dirname,
        '..',
        '..',
        'keys',
        'public.pem'
      );
      if (fs.existsSync(publicKeyPath)) {
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        this.logger.debug(
          'Backend public key (first 100 chars):',
          publicKey.substring(0, 100)
        );

        // Check if client has the same public key - fix the path
        const clientPublicKeyPath = path.resolve(
          __dirname,
          '..',
          '..',
          '..',
          '..',
          'apps',
          'student-client-electron',
          'src',
          'keys',
          'public.pem'
        );
        if (fs.existsSync(clientPublicKeyPath)) {
          const clientPublicKey = fs.readFileSync(clientPublicKeyPath, 'utf8');
          this.logger.debug(
            'Client public key (first 100 chars):',
            clientPublicKey.substring(0, 100)
          );

          const keysMatch = publicKey.trim() === clientPublicKey.trim();
          this.logger.warn(`Public keys match: ${keysMatch}`);

          if (!keysMatch) {
            this.logger.error(
              '❌ PUBLIC KEY MISMATCH DETECTED! Client and backend are using different public keys.'
            );
            this.logger.error(
              'This explains why decryption is failing. The client encrypted with a different public key.'
            );
            this.logger.error(
              'Solution: Run "node generate-keys.js" to regenerate matching keys for both client and backend.'
            );
          } else {
            this.logger.log(
              '✅ Public keys match, issue must be in encryption/decryption algorithm'
            );
          }
        } else {
          this.logger.warn(
            'Client public key not found at:',
            clientPublicKeyPath
          );
        }
      } else {
        this.logger.warn('Backend public key not found at:', publicKeyPath);
      }
    } catch (error) {
      this.logger.error('Failed to check public key info:', error.message);
    }
  }
}
