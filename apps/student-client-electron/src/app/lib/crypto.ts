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
}
