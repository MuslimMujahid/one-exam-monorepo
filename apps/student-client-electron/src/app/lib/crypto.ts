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

      console.log('Looking for public key, __dirname is:', __dirname);

      for (const keyPath of possiblePaths) {
        if (fs.existsSync(keyPath)) {
          console.log('Found public key at:', keyPath);
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

      console.log('Looking for license key...');

      for (const keyPath of possiblePaths) {
        if (fs.existsSync(keyPath)) {
          console.log('Found license key at:', keyPath);
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
      console.log('🔐 Starting signature verification...');
      console.log(
        'Encrypted license (base64) length:',
        encryptedLicenseBase64.length
      );
      console.log('Signature length:', signature.length);
      console.log('Public key length:', publicKey.length);

      // Log samples for debugging
      console.log(
        'Encrypted license (first 50 chars):',
        encryptedLicenseBase64.substring(0, 50)
      );
      console.log('Signature (first 50 chars):', signature.substring(0, 50));

      // Test signature validity format
      try {
        Buffer.from(signature, 'base64');
        console.log('✅ Signature is valid base64');
      } catch (base64Error) {
        console.error('❌ Signature is not valid base64:', base64Error.message);
        return false;
      }

      // Test encrypted license base64 validity
      try {
        Buffer.from(encryptedLicenseBase64, 'base64');
        console.log('✅ Encrypted license is valid base64');
      } catch (base64Error) {
        console.error(
          '❌ Encrypted license is not valid base64:',
          base64Error.message
        );
        return false;
      }

      // Verify signature using the same approach as test-signature.js
      // The signature was created on the base64-encoded encrypted license
      const verifier = crypto.createVerify(this.HASH_ALGORITHM);
      verifier.update(encryptedLicenseBase64);
      verifier.end();

      console.log('🔍 Attempting signature verification with createVerify...');
      const isValid = verifier.verify(publicKey, signature, 'base64');
      console.log(
        'Signature verification result:',
        isValid ? '✅ VALID' : '❌ INVALID'
      );

      if (!isValid) {
        console.warn('❌ License signature verification failed');

        // Additional debugging info
        console.log('🔍 Debug info:');
        console.log('- Hash algorithm:', this.HASH_ALGORITHM);
        console.log(
          '- Public key preview:',
          publicKey.substring(0, 100) + '...'
        );
        console.log('- Signature preview:', signature.substring(0, 50) + '...');
        console.log(
          '- Data being verified preview:',
          encryptedLicenseBase64.substring(0, 50) + '...'
        );
      } else {
        console.log('✅ License signature verification succeeded');
      }

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
      console.log('🔓 Starting license decryption...');
      console.log(
        'Encrypted license (base64) length:',
        encryptedLicenseBase64.length
      );
      console.log('License key length:', licenseEncryptionKey.length);

      // First decode the base64 to get the iv:encrypted:authTag format
      const ivEncryptedAuth = Buffer.from(
        encryptedLicenseBase64,
        'base64'
      ).toString('utf8');
      console.log(
        'Decoded iv:encrypted:authTag format:',
        ivEncryptedAuth.substring(0, 100) + '...'
      );

      const parts = ivEncryptedAuth.split(':');
      if (parts.length !== 3) {
        throw new Error(
          `Invalid encrypted license format - expected 3 parts (iv:encrypted:authTag), got ${parts.length}`
        );
      }

      const [ivHex, encrypted, authTagHex] = parts;
      console.log('IV (hex) length:', ivHex.length);
      console.log('Encrypted data length:', encrypted.length);
      console.log('Auth tag (hex) length:', authTagHex.length);

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
        throw new Error(
          `Invalid key, IV, or auth tag length - IV: ${iv.length}, Key: ${key.length}, Auth tag: ${authTag.length}`
        );
      }

      console.log('✅ IV, key, and auth tag lengths are valid');

      // Decrypt using GCM with proper auth tag
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('✅ GCM decryption successful with auth tag');
      const parsedLicense = JSON.parse(decrypted) as LicenseData;
      console.log('✅ License JSON parsing successful');
      console.log('License exam ID:', parsedLicense.examId);
      console.log('License exam title:', parsedLicense.examTitle);
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
      console.log('🔍 Parsing signed license...');
      console.log('Signed license length:', signedLicense.length);
      console.log(
        'Signed license (first 100 chars):',
        signedLicense.substring(0, 100)
      );

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

      console.log(
        '📝 Encrypted license (base64) length:',
        encryptedLicenseBase64.length
      );
      console.log('📝 Signature length:', signature.length);
      console.log(
        '📝 Encrypted license (first 50 chars):',
        encryptedLicenseBase64.substring(0, 50)
      );
      console.log('📝 Signature (first 50 chars):', signature.substring(0, 50));

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
   * Test signature verification with sample data (for debugging)
   */
  static testSignatureVerification(): boolean {
    try {
      const testData = 'test message for signature verification';
      const publicKey = this.getPublicKey();

      console.log('Testing signature verification with sample data...');
      console.log('Test data:', testData);
      console.log('Public key length:', publicKey.length);

      // We can't create a signature here since we don't have the private key,
      // but we can test the verification setup
      return true;
    } catch (error) {
      console.error('Signature verification test failed:', error);
      return false;
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
        'Processing offline exam for examCode:',
        downloadedData.examCode
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

      console.log('✅ License signature verification succeeded');

      // 3. Decrypt license
      const license = this.decryptLicenseFile(
        licenseComponents.encryptedLicense,
        licenseEncryptionKey
      );
      if (!license) {
        console.error('Failed to decrypt license');
        return null;
      }

      console.log(
        '✅ Successfully decrypted license for exam:',
        license.examTitle
      );

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

      console.log(
        '✅ Successfully decrypted complete exam data for:',
        examData.title
      );
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
   * Create mock exam data for testing purposes
   * @param examCode - The exam code
   * @returns Mock decrypted exam data
   */
  private static createMockExamData(examCode: string): DecryptedExamData {
    console.log('Creating mock exam data for testing purposes');
    return {
      id: `mock-exam-${examCode}`,
      title: `Mock Exam: ${examCode}`,
      description:
        'This is a mock exam created for testing the offline decryption system',
      startDate: new Date(Date.now() - 60000).toISOString(), // Started 1 minute ago
      endDate: new Date(Date.now() + 3600000).toISOString(), // Ends in 1 hour
      examCode: examCode,
      teacherName: 'Test Teacher',
      questions: [
        {
          id: 1,
          type: 'multiple-choice-single',
          question: 'What is the result of 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          points: 5,
        },
        {
          id: 2,
          type: 'multiple-choice-single',
          question: 'Which programming language is this system built with?',
          options: ['Python', 'TypeScript', 'Java', 'C++'],
          correctAnswer: 1,
          points: 5,
        },
        {
          id: 3,
          type: 'text',
          question: 'Explain the purpose of offline exam functionality.',
          points: 10,
        },
      ],
    };
  }

  /**
   * Debug function to test crypto functionality with known data
   * This helps verify that our keys and algorithms are working correctly
   */
  static debugCryptoFunctionality(): boolean {
    try {
      console.log('🔧 Starting crypto functionality debug...');

      // Get our keys
      const licenseEncryptionKey = this.getLicenseEncryptionKey();
      console.log(
        'License encryption key (first 16 chars):',
        licenseEncryptionKey.substring(0, 16) + '...'
      );

      // Test encryption/decryption with a simple JSON object
      const testLicense: LicenseData = {
        examId: 'debug-test-exam',
        examEncryptionKey:
          '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        examCode: 'DEBUG123',
        examTitle: 'Debug Test Exam',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        issuedAt: new Date().toISOString(),
        userId: 'debug-user-id',
      };

      const testLicenseJson = JSON.stringify(testLicense);
      console.log('Test license JSON length:', testLicenseJson.length);
      console.log('Test license JSON:', testLicenseJson);

      // Manually encrypt the test license using the same algorithm as backend
      const iv = crypto.randomBytes(12); // GCM uses 12 bytes for IV
      const key = Buffer.from(licenseEncryptionKey, 'hex');
      const cipher = crypto.createCipheriv(this.AES_ALGORITHM, key, iv);

      let encrypted = cipher.update(testLicenseJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get the authentication tag for GCM mode
      const authTag = cipher.getAuthTag();

      const encryptedLicense = `${iv.toString(
        'hex'
      )}:${encrypted}:${authTag.toString('hex')}`;
      console.log('Test encrypted license:', encryptedLicense);

      // Now try to decrypt it using our function
      const decryptedLicense = this.decryptLicenseFile(
        encryptedLicense,
        licenseEncryptionKey
      );

      if (decryptedLicense) {
        console.log(
          '✅ Crypto test passed - encryption/decryption working correctly'
        );
        console.log(
          'Decrypted license exam title:',
          decryptedLicense.examTitle
        );
        return true;
      } else {
        console.log('❌ Crypto test failed - decryption returned null');
        return false;
      }
    } catch (error) {
      console.error('❌ Crypto debug failed:', error);
      return false;
    }
  }

  /**
   * Debug function to analyze the structure of the real encrypted license
   */
  static analyzeEncryptedLicense(encryptedLicense: string): void {
    try {
      console.log('🔍 Analyzing encrypted license structure...');

      const [ivHex, encrypted] = encryptedLicense.split(':');
      console.log('IV (hex):', ivHex);
      console.log(
        'IV length:',
        ivHex.length,
        'chars =',
        ivHex.length / 2,
        'bytes'
      );
      console.log(
        'Encrypted data length:',
        encrypted.length,
        'chars =',
        encrypted.length / 2,
        'bytes'
      );

      // Check if encrypted data length is valid for AES-256-CBC
      const encryptedBytes = encrypted.length / 2;
      console.log(
        'Encrypted data is multiple of 16 bytes:',
        encryptedBytes % 16 === 0
      );
      console.log('Number of AES blocks:', Math.floor(encryptedBytes / 16));

      // Analyze hex patterns
      const hexPattern = /^[0-9a-fA-F]+$/;
      console.log('IV is valid hex:', hexPattern.test(ivHex));
      console.log('Encrypted data is valid hex:', hexPattern.test(encrypted));

      // Try to identify any patterns or issues
      const firstBlock = encrypted.substring(0, 32);
      const lastBlock = encrypted.substring(encrypted.length - 32);
      console.log('First block (hex):', firstBlock);
      console.log('Last block (hex):', lastBlock);
    } catch (error) {
      console.error('Failed to analyze encrypted license:', error);
    }
  }

  /**
   * Test decryption with multiple possible license keys
   * This helps identify which key was actually used to encrypt the data
   */
  static testMultipleLicenseKeys(encryptedLicense: string): {
    key: string;
    result: LicenseData | null;
    source: string;
  }[] {
    const possibleKeys = [
      {
        key: 'af62fd6f18ddd0eab83459944180bb01b168f29bd818a1269803a0440bad746d',
        source: 'backend/electron embedded key',
      },
      {
        key: '5090c557f55c87f16fa12a76019ce1cda4f7608ec3fb355bdb296120c30c0821',
        source: 'root workspace key',
      },
    ];

    const results = [];

    for (const { key, source } of possibleKeys) {
      console.log(`🔑 Testing license key from ${source}...`);
      console.log(`🔑 Key: ${key.substring(0, 16)}...`);

      try {
        const result = this.decryptLicenseFile(encryptedLicense, key);
        console.log(
          `🔑 Result for ${source}:`,
          result ? '✅ SUCCESS' : '❌ FAILED'
        );

        results.push({
          key: key,
          result: result,
          source: source,
        });

        if (result) {
          console.log(`🎉 SUCCESS! License encrypted with ${source}`);
          console.log(`🎉 Exam: ${result.examTitle}`);
        }
      } catch (error) {
        console.log(`🔑 Error testing ${source}:`, error.message);
        results.push({
          key: key,
          result: null,
          source: source,
        });
      }
    }

    return results;
  }
}
