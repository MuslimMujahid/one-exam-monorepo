import * as crypto from 'crypto';

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

// Question interface for exam content
export interface ExamQuestion {
  id: string;
  text: string;
  questionType: string;
  options: unknown;
  points: number;
}

// Exam data interface for decrypted content
export interface DecryptedExamData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  examCode: string;
  questions: ExamQuestion[];
  teacherName: string;
}

// Downloaded exam response interface
export interface DownloadExamResponse {
  examCode: string;
  encryptedExamData: string;
  signedLicense: string;
  prefetchedAt: string;
}

/**
 * Crypto utilities for license and exam data decryption
 * These functions will be used on the client side to handle offline exam data
 */
export class ClientCrypto {
  private static readonly AES_ALGORITHM = 'aes-256-cbc';
  private static readonly HASH_ALGORITHM = 'sha256';

  /**
   * Verify RSA signature for license validation
   * @param encryptedLicense - The encrypted license data
   * @param signature - The RSA signature to verify
   * @param publicKey - The public key for verification
   * @returns true if signature is valid
   */
  static verifyLicenseSignature(
    encryptedLicense: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const verifier = crypto.createVerify(this.HASH_ALGORITHM);
      verifier.update(encryptedLicense);
      verifier.end();
      return verifier.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error('Failed to verify license signature:', error);
      return false;
    }
  }

  /**
   * Decrypt license file using license encryption key
   * @param encryptedLicense - The encrypted license data (iv:encrypted format)
   * @param licenseEncryptionKey - The license encryption key (hex string)
   * @returns Decrypted license data or null if decryption fails
   */
  static decryptLicenseFile(
    encryptedLicense: string,
    licenseEncryptionKey: string
  ): LicenseData | null {
    try {
      const [ivHex, encrypted] = encryptedLicense.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted license format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(licenseEncryptionKey, 'hex');
      const decipher = crypto.createDecipheriv(this.AES_ALGORITHM, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as LicenseData;
    } catch (error) {
      console.error('Failed to decrypt license file:', error);
      return null;
    }
  }

  /**
   * Decrypt exam content using exam encryption key from license
   * @param encryptedExamData - The encrypted exam data (iv:encrypted format)
   * @param examEncryptionKey - The exam encryption key (hex string)
   * @returns Decrypted exam data or null if decryption fails
   */
  static decryptExamContent(
    encryptedExamData: string,
    examEncryptionKey: string
  ): DecryptedExamData | null {
    try {
      const [ivHex, encrypted] = encryptedExamData.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted exam data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(examEncryptionKey, 'hex');
      const decipher = crypto.createDecipheriv(this.AES_ALGORITHM, key, iv);

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
   * @param signedLicense - Base64 encoded signed license
   * @returns Object with encrypted license and signature
   */
  static parseSignedLicense(signedLicense: string): {
    encryptedLicense: string;
    signature: string;
  } | null {
    try {
      // Decode base64
      const decoded = Buffer.from(signedLicense, 'base64').toString('utf8');
      const [encryptedLicense, signature] = decoded.split('\n');

      if (!encryptedLicense || !signature) {
        throw new Error('Invalid signed license format');
      }

      return { encryptedLicense, signature };
    } catch (error) {
      console.error('Failed to parse signed license:', error);
      return null;
    }
  }

  /**
   * Complete license verification and exam data decryption process
   * @param downloadedData - The downloaded exam response
   * @param publicKey - RSA public key for signature verification
   * @param licenseEncryptionKey - License encryption key
   * @param userId - Optional user ID for validation
   * @returns Decrypted exam data or null if any step fails
   */
  static processOfflineExam(
    downloadedData: DownloadExamResponse,
    publicKey: string,
    licenseEncryptionKey: string,
    userId?: string
  ): DecryptedExamData | null {
    try {
      // 1. Parse signed license
      const licenseComponents = this.parseSignedLicense(
        downloadedData.signedLicense
      );
      if (!licenseComponents) {
        console.error('Failed to parse signed license');
        return null;
      }

      // 2. Verify signature
      if (
        !this.verifyLicenseSignature(
          licenseComponents.encryptedLicense,
          licenseComponents.signature,
          publicKey
        )
      ) {
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

      console.log('Successfully decrypted exam data for:', examData.title);
      return examData;
    } catch (error) {
      console.error('Failed to process offline exam:', error);
      return null;
    }
  }
}
