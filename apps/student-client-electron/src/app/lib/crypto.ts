import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// License data interface (matching the backend)
export interface LicenseData {
  examId: string;
  examEncryptionKey: string;
  examCode: string;
  examTitle: string;
  startDate: string;
  endDate: string;
  issuedAt: string;
  userId: string;
}

// Exam data interface for decrypted content
export interface DecryptedExamData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  examCode: string;
  questions: unknown[];
  teacherName: string;
}

// Downloaded exam response interface
export interface DownloadExamResponse {
  examId: string;
  examCode: string;
  encryptedExamData: string;
  signedLicense: string;
  prefetchedAt: string;
}

// Submission-related interfaces
export interface ExamSubmissionData {
  examId: string;
  studentId: string;
  answers: Record<
    number,
    {
      questionId: number;
      answer: string | number | number[];
      timeSpent: number;
    }
  >;
  finalAnswersHash: string;
  sealingTimestamp: string;
}

// Exam session interfaces
export interface ExamSession {
  sessionId: string;
  examId: string;
  studentId: string;
  examStartedAt: string;
  lastActivity: string;
  currentQuestionIndex: number;
  timeRemaining: number; // in seconds
  answers: Record<
    number,
    {
      questionId: number;
      answer: string | number | number[];
      timeSpent: number;
    }
  >;
  examStarted: boolean;
  examSubmitted: boolean;
  autoSaveEnabled: boolean;
}

export interface SessionSaveData extends ExamSession {
  savedAt: string;
  version: string; // For future compatibility
}

export interface EncryptedSubmissionPackage {
  encryptedSealedAnswers: string; // Base64 encoded encrypted sealed answers
  encryptedSubmissionKey: string; // Base64 encoded RSA-encrypted submission key
  submissionId: string; // Unique identifier for this submission
}

/**
 * Electron-side crypto utilities for license and exam data decryption
 * These functions use Node.js crypto module for server-grade encryption
 */
export class ElectronCrypto {
  private static readonly AES_ALGORITHM = 'aes-256-gcm';
  private static readonly HASH_ALGORITHM = 'sha256';

  // Get embedded keys from the electron app
  private static getPublicKey(): string {
    try {
      // Try multiple possible paths for the public key
      const possiblePaths = [
        // Built application (most common in production)
        path.join(__dirname, 'keys', 'public.pem'),
        // Development mode (from source)
        path.join(__dirname, '..', '..', 'keys', 'public.pem'),
        // Production mode (from app root)
        path.join(app.getAppPath(), 'keys', 'public.pem'),
        // Alternative production path
        path.join(process.resourcesPath, 'keys', 'public.pem'),
      ];

      for (const keyPath of possiblePaths) {
        if (fs.existsSync(keyPath)) {
          return fs.readFileSync(keyPath, 'utf8');
        }
      }

      throw new Error(
        `Public key not found in any of the expected locations: ${possiblePaths.join(
          ', '
        )}`
      );
    } catch (error) {
      console.error('Failed to load public key:', error);
      throw new Error('Public key not found');
    }
  }

  private static getLicenseEncryptionKey(): string {
    try {
      // Try multiple possible paths for the license key
      const possiblePaths = [
        // Built application (most common in production)
        path.join(__dirname, 'keys', 'license.key'),
        // Development mode (from source)
        path.join(__dirname, '..', '..', 'keys', 'license.key'),
        // Production mode (from app root)
        path.join(app.getAppPath(), 'keys', 'license.key'),
        // Alternative production path
        path.join(process.resourcesPath, 'keys', 'license.key'),
      ];

      for (const keyPath of possiblePaths) {
        if (fs.existsSync(keyPath)) {
          return fs.readFileSync(keyPath, 'utf8').trim();
        }
      }

      throw new Error(
        `License key not found in any of the expected locations: ${possiblePaths.join(
          ', '
        )}`
      );
    } catch (error) {
      console.error('Failed to load license encryption key:', error);
      throw new Error('License encryption key not found');
    }
  }

  /**
   * Verify RSA signature for license validation
   * @param encryptedLicenseBase64 - The base64-encoded encrypted license data
   * @param signature - The RSA signature to verify
   * @param publicKey - The public key for verification
   * @returns true if signature is valid
   */
  static verifyLicenseSignature(
    encryptedLicenseBase64: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      // Verify signature
      // The signature was created on the base64-encoded encrypted license
      const verifier = crypto.createVerify(this.HASH_ALGORITHM);
      verifier.update(encryptedLicenseBase64);
      verifier.end();

      const isValid = verifier.verify(publicKey, signature, 'base64');
      return isValid;
    } catch (error) {
      console.error('Failed to verify license signature:', error.message);
      console.error('Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Decrypt license file using license encryption key
   * @param encryptedLicenseBase64 - The base64-encoded encrypted license data (contains iv:encrypted format)
   * @param licenseEncryptionKey - The license encryption key (hex string)
   * @returns Decrypted license data or null if decryption fails
   */
  static decryptLicenseFile(
    encryptedLicenseBase64: string,
    licenseEncryptionKey: string
  ): LicenseData | null {
    try {
      // First decode the base64 to get the iv:encrypted:authTag format
      const ivEncryptedAuth = Buffer.from(
        encryptedLicenseBase64,
        'base64'
      ).toString('utf8');

      const parts = ivEncryptedAuth.split(':');
      if (parts.length !== 3) {
        throw new Error(`Invalid encrypted license format`);
      }

      const [ivHex, encrypted, authTagHex] = parts;
      // Validate hex strings before conversion
      const hexPattern = /^[0-9a-fA-F]+$/;
      if (
        !hexPattern.test(ivHex) ||
        !hexPattern.test(encrypted) ||
        !hexPattern.test(authTagHex) ||
        !hexPattern.test(licenseEncryptionKey)
      ) {
        throw new Error('Invalid hex format in encryption data');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(licenseEncryptionKey, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Validate buffer lengths (GCM uses 12-byte IV, 16-byte auth tag)
      if (iv.length !== 12 || key.length !== 32 || authTag.length !== 16) {
        throw new Error(`Invalid key format`);
      }

      // Decrypt using GCM with proper auth tag
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const parsedLicense = JSON.parse(decrypted) as LicenseData;
      return parsedLicense;
    } catch (error) {
      console.error('Failed to decrypt license file:', error.message);
      console.error('Error details:', error);
      return null;
    }
  }

  /**
   * Decrypt exam content using exam encryption key from license
   * @param encryptedExamData - The encrypted exam data (iv:encrypted:authTag format)
   * @param examEncryptionKey - The exam encryption key (hex string)
   * @returns Decrypted exam data or null if decryption fails
   */
  static decryptExamContent(
    encryptedExamData: string,
    examEncryptionKey: string
  ): DecryptedExamData | null {
    try {
      const parts = encryptedExamData.split(':');
      if (parts.length !== 3) {
        throw new Error(
          `Invalid encrypted exam data format - expected 3 parts (iv:encrypted:authTag), got ${parts.length}`
        );
      }

      const [ivHex, encrypted, authTagHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(examEncryptionKey, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.AES_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as DecryptedExamData;
    } catch (error) {
      console.error('Failed to decrypt exam content:', error);
      return null;
    }
  }

  /**
   * Validate license timing and user information
   * @param license - The decrypted license data
   * @param userId - The current user ID (optional for additional validation)
   * @returns true if license is valid
   */
  static validateLicense(license: LicenseData, userId?: string): boolean {
    try {
      const now = new Date();
      const startDate = new Date(license.startDate);
      const endDate = new Date(license.endDate);

      // Check if exam is within time window
      if (now < startDate) {
        console.warn('Exam has not started yet');
        return false;
      }

      if (now > endDate) {
        console.warn('Exam has ended');
        return false;
      }

      // Optional: Check if license belongs to current user
      if (userId && license.userId !== userId) {
        console.warn('License does not belong to current user');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to validate license:', error);
      return false;
    }
  }

  /**
   * Parse signed license and extract components
   * @param signedLicense - The signed license in format: base64EncodedEncryptedLicense:signature
   * @returns Object with encrypted license and signature
   */
  static parseSignedLicense(signedLicense: string): {
    encryptedLicense: string;
    signature: string;
  } | null {
    try {
      // Split on the last colon to separate base64 encrypted license from signature
      // This handles base64 strings that might contain colons
      const lastColonIndex = signedLicense.lastIndexOf(':');
      if (lastColonIndex === -1) {
        throw new Error(
          'Invalid signed license format - no colon separator found'
        );
      }

      const encryptedLicenseBase64 = signedLicense.substring(0, lastColonIndex);
      const signature = signedLicense.substring(lastColonIndex + 1);

      if (!encryptedLicenseBase64 || !signature) {
        throw new Error('Invalid signed license format - missing components');
      }

      return {
        encryptedLicense: encryptedLicenseBase64,
        signature: signature,
      };
    } catch (error) {
      console.error('Failed to parse signed license:', error.message);
      return null;
    }
  }

  /**
   * Complete license verification and exam data decryption process
   * @param downloadedData - The downloaded exam response
   * @param userId - Optional user ID for validation
   * @returns Decrypted exam data or null if any step fails
   */
  static processOfflineExam(
    downloadedData: DownloadExamResponse,
    userId?: string
  ): DecryptedExamData | null {
    try {
      console.log(
        'Processing offline exam for exam id:',
        downloadedData.examId
      );

      // Get embedded keys
      const publicKey = this.getPublicKey();
      const licenseEncryptionKey = this.getLicenseEncryptionKey();

      // 1. Parse signed license
      const licenseComponents = this.parseSignedLicense(
        downloadedData.signedLicense
      );
      if (!licenseComponents) {
        console.error('Failed to parse signed license');
        return null;
      }

      // 2. Verify signature
      const signatureValid = this.verifyLicenseSignature(
        licenseComponents.encryptedLicense,
        licenseComponents.signature,
        publicKey
      );

      if (!signatureValid) {
        console.error('License signature verification failed');
        return null;
      }

      // 3. Decrypt license
      const license = this.decryptLicenseFile(
        licenseComponents.encryptedLicense,
        licenseEncryptionKey
      );
      if (!license) {
        console.error('Failed to decrypt license');
        return null;
      }

      // 4. Validate license timing and user
      if (!this.validateLicense(license, userId)) {
        console.error('License validation failed');
        return null;
      }

      // 5. Decrypt exam content
      const examData = this.decryptExamContent(
        downloadedData.encryptedExamData,
        license.examEncryptionKey
      );
      if (!examData) {
        console.error('Failed to decrypt exam content');
        return null;
      }

      return examData;
    } catch (error) {
      console.error('Failed to process offline exam:', error);
      return null;
    }
  }

  /**
   * Get client configuration (for potential future use)
   * @returns Object with public key and license encryption key
   */
  static getClientConfig(): {
    publicKey: string;
    licenseEncryptionKey: string;
  } {
    return {
      publicKey: this.getPublicKey(),
      licenseEncryptionKey: this.getLicenseEncryptionKey(),
    };
  }

  /**
   * Generate a unique submission ID
   * @returns A unique submission identifier
   */
  static generateSubmissionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate a symmetric key for exam submission encryption
   * @returns Base64 encoded 32-byte AES key
   */
  static generateSubmissionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Canonicalize answer data for consistent hashing
   * @param answers - The answers object to canonicalize
   * @returns Canonicalized string representation
   */
  static canonicalizeAnswers(
    answers: Record<
      number,
      {
        questionId: number;
        answer: string | number | number[];
        timeSpent: number;
      }
    >
  ): string {
    // Sort by question ID to ensure consistent ordering
    const sortedQuestionIds = Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b);

    const canonicalAnswers = sortedQuestionIds.map((questionId) => {
      const answer = answers[questionId];

      // Safety check - ensure answer object exists
      if (!answer || typeof answer !== 'object') {
        console.warn(
          `Missing or invalid answer for question ${questionId}, using default`
        );
        return {
          questionId: questionId,
          answer: '',
          timeSpent: 0,
        };
      }

      // Normalize answer based on type
      let normalizedAnswer: string | number | number[];
      if (Array.isArray(answer.answer)) {
        // Sort array answers to ensure consistent ordering
        normalizedAnswer = [...answer.answer].sort();
      } else if (typeof answer.answer === 'string') {
        // Trim whitespace from string answers
        normalizedAnswer = answer.answer.trim();
      } else {
        normalizedAnswer = answer.answer;
      }

      return {
        questionId: answer.questionId,
        answer: normalizedAnswer,
        timeSpent: Math.floor(answer.timeSpent), // Ensure consistent integer representation
      };
    });

    // Return JSON string with consistent formatting
    return JSON.stringify(canonicalAnswers, null, 0);
  }

  /**
   * Generate hash of canonicalized answer data
   * @param answers - The answers to hash
   * @returns SHA-256 hash of the canonicalized answers
   */
  static generateAnswersHash(
    answers: Record<
      number,
      {
        questionId: number;
        answer: string | number | number[];
        timeSpent: number;
      }
    >
  ): string {
    const canonicalAnswers = this.canonicalizeAnswers(answers);
    return crypto
      .createHash(this.HASH_ALGORITHM)
      .update(canonicalAnswers)
      .digest('hex');
  }

  /**
   * Create a sealed answers package
   * @param examId - The exam identifier
   * @param studentId - The student identifier
   * @param answers - The student's answers
   * @returns Sealed answers package data
   */
  static createSealedAnswersPackage(
    examId: string,
    studentId: string,
    answers: Record<
      number,
      {
        questionId: number;
        answer: string | number | number[];
        timeSpent: number;
      }
    >
  ): ExamSubmissionData {
    const finalAnswersHash = this.generateAnswersHash(answers);
    const sealingTimestamp = new Date().toISOString();

    return {
      examId,
      studentId,
      answers,
      finalAnswersHash,
      sealingTimestamp,
    };
  }

  /**
   * Encrypt sealed answers package with submission key
   * @param sealedAnswers - The sealed answers package
   * @param submissionKey - Base64 encoded submission key
   * @returns Encrypted sealed answers (iv:encrypted:authTag format)
   */
  static encryptSealedAnswers(
    sealedAnswers: ExamSubmissionData,
    submissionKey: string
  ): string {
    try {
      const key = Buffer.from(submissionKey, 'base64');
      const iv = crypto.randomBytes(12); // 12 bytes for GCM

      const cipher = crypto.createCipheriv(this.AES_ALGORITHM, key, iv);

      const plaintext = JSON.stringify(sealedAnswers);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return in iv:encrypted:authTag format
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      console.error('Failed to encrypt sealed answers:', error);
      throw new Error('Failed to encrypt sealed answers');
    }
  }

  /**
   * Encrypt submission key with RSA public key
   * @param submissionKey - Base64 encoded submission key
   * @returns Base64 encoded encrypted submission key
   */
  static encryptSubmissionKey(submissionKey: string): string {
    try {
      const publicKey = this.getPublicKey();
      const buffer = Buffer.from(submissionKey, 'base64');

      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer
      );

      return encrypted.toString('base64');
    } catch (error) {
      console.error('Failed to encrypt submission key:', error);
      throw new Error('Failed to encrypt submission key');
    }
  }

  /**
   * Create complete encrypted submission package
   * @param examId - The exam identifier
   * @param studentId - The student identifier
   * @param answers - The student's answers
   * @returns Complete encrypted submission package
   */
  static createEncryptedSubmission(
    examId: string,
    studentId: string,
    answers: Record<
      number,
      {
        questionId: number;
        answer: string | number | number[];
        timeSpent: number;
      }
    >
  ): EncryptedSubmissionPackage {
    try {
      console.log(
        'Creating encrypted submission for exam:',
        examId,
        'student:',
        studentId
      );
      console.log('Answers received:', JSON.stringify(answers, null, 2));

      // Validate answers structure
      if (!answers || typeof answers !== 'object') {
        throw new Error('Invalid answers object provided');
      }

      // Generate unique submission ID and key
      const submissionId = this.generateSubmissionId();
      const submissionKey = this.generateSubmissionKey();

      // Create sealed answers package
      const sealedAnswers = this.createSealedAnswersPackage(
        examId,
        studentId,
        answers
      );

      // Encrypt the sealed answers with the submission key
      const encryptedSealedAnswers = this.encryptSealedAnswers(
        sealedAnswers,
        submissionKey
      );

      // Encrypt the submission key with RSA public key
      const encryptedSubmissionKey = this.encryptSubmissionKey(submissionKey);

      return {
        encryptedSealedAnswers,
        encryptedSubmissionKey,
        submissionId,
      };
    } catch (error) {
      console.error('Failed to create encrypted submission:', error);
      throw new Error('Failed to create encrypted submission');
    }
  }

  /**
   * Generate a unique session ID
   * @returns A unique session identifier
   */
  static generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create a new exam session
   * @param examId - The exam identifier
   * @param studentId - The student identifier
   * @returns New exam session data
   */
  static createExamSession(examId: string, studentId: string): ExamSession {
    const now = new Date().toISOString();

    return {
      sessionId: this.generateSessionId(),
      examId,
      studentId,
      examStartedAt: now,
      lastActivity: now,
      currentQuestionIndex: 0,
      timeRemaining: 0, // Will be set when exam starts
      answers: {},
      examStarted: false,
      examSubmitted: false,
      autoSaveEnabled: true,
    };
  }

  /**
   * Update exam session with current state
   * @param session - Current session data
   * @param updates - Updates to apply
   * @returns Updated session data
   */
  static updateExamSession(
    session: ExamSession,
    updates: Partial<
      Omit<ExamSession, 'sessionId' | 'examId' | 'studentId' | 'examStartedAt'>
    >
  ): ExamSession {
    return {
      ...session,
      ...updates,
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Prepare session data for storage
   * @param session - Session data to save
   * @returns Session save data with metadata
   */
  static prepareSessionForSave(session: ExamSession): SessionSaveData {
    return {
      ...session,
      savedAt: new Date().toISOString(),
      version: '1.0', // For future compatibility
    };
  }

  /**
   * Validate session data integrity
   * @param sessionData - Session data to validate
   * @returns true if session is valid
   */
  static validateSession(sessionData: SessionSaveData): boolean {
    try {
      // Check required fields
      const requiredFields = [
        'sessionId',
        'examId',
        'studentId',
        'examStartedAt',
        'lastActivity',
        'currentQuestionIndex',
        'timeRemaining',
      ];

      for (const field of requiredFields) {
        if (!(field in sessionData)) {
          console.warn(`Missing required session field: ${field}`);
          return false;
        }
      }

      // Validate session ID format
      if (!/^[0-9a-f]{32}$/.test(sessionData.sessionId)) {
        console.warn('Invalid session ID format');
        return false;
      }

      // Validate timestamps
      const examStartedAt = new Date(sessionData.examStartedAt);
      const lastActivity = new Date(sessionData.lastActivity);
      const savedAt = new Date(sessionData.savedAt);

      if (
        isNaN(examStartedAt.getTime()) ||
        isNaN(lastActivity.getTime()) ||
        isNaN(savedAt.getTime())
      ) {
        console.warn('Invalid timestamp in session data');
        return false;
      }

      // Validate numeric fields
      if (
        sessionData.currentQuestionIndex < 0 ||
        sessionData.timeRemaining < 0
      ) {
        console.warn('Invalid numeric values in session data');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Check if session has expired (older than 24 hours)
   * @param sessionData - Session data to check
   * @returns true if session is expired
   */
  static isSessionExpired(sessionData: SessionSaveData): boolean {
    try {
      const lastActivity = new Date(sessionData.lastActivity);
      const now = new Date();
      const hoursSinceActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      return hoursSinceActivity > 24; // 24 hours expiry
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return true; // Consider expired if we can't parse dates
    }
  }
}
