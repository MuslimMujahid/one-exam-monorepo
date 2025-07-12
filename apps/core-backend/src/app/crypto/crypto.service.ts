import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly RSA_KEY_SIZE = 2048;
  private readonly AES_ALGORITHM = 'aes-256-gcm';
  private readonly RSA_ALGORITHM = 'RSA-PKCS1-PSS';
  private readonly HASH_ALGORITHM = 'sha256';

  private privateKey: string;
  private publicKey: string;
  private licenseEncryptionKey: string;

  private readonly keysDirectory = path.join(process.cwd(), 'keys');

  async onModuleInit() {
    await this.initializeKeys();
  }

  /**
   * Initialize RSA key pair and license encryption key
   * This should be called during application startup
   */
  private async initializeKeys() {
    // Ensure keys directory exists
    if (!fs.existsSync(this.keysDirectory)) {
      fs.mkdirSync(this.keysDirectory, { recursive: true });
    }

    const privateKeyPath = path.join(this.keysDirectory, 'private.pem');
    const publicKeyPath = path.join(this.keysDirectory, 'public.pem');
    const licenseKeyPath = path.join(this.keysDirectory, 'license.key');

    // Load or generate RSA key pair
    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    } else {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.RSA_KEY_SIZE,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      this.publicKey = publicKey;
      this.privateKey = privateKey;

      // Save keys to files
      fs.writeFileSync(privateKeyPath, privateKey);
      fs.writeFileSync(publicKeyPath, publicKey);
    }

    // Load or generate license encryption key
    if (fs.existsSync(licenseKeyPath)) {
      this.licenseEncryptionKey = fs.readFileSync(licenseKeyPath, 'utf8');
    } else {
      this.licenseEncryptionKey = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(licenseKeyPath, this.licenseEncryptionKey);
    }
  }

  /**
   * Generate a unique symmetric encryption key for an exam
   */
  generateExamEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt exam content with the exam's encryption key
   */
  encryptExamContent(content: string, examEncryptionKey: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(examEncryptionKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Create a license file with exam metadata and encryption key
   */
  createLicenseFile(licenseData: LicenseData): string {
    return JSON.stringify(licenseData);
  }

  /**
   * Encrypt license file with the license encryption key
   */
  encryptLicenseFile(licenseContent: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.licenseEncryptionKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(licenseContent, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Sign the encrypted license file with the private key
   */
  signLicenseFile(encryptedLicense: string): string {
    const signer = crypto.createSign('sha256');
    signer.update(encryptedLicense);
    signer.end();
    return signer.sign(this.privateKey, 'base64');
  }

  /**
   * Create a complete signed license package
   */
  createSignedLicense(licenseData: LicenseData): string {
    const licenseContent = this.createLicenseFile(licenseData);
    const encryptedLicense = this.encryptLicenseFile(licenseContent);
    const signature = this.signLicenseFile(encryptedLicense);

    // Combine encrypted license and signature separated by newline
    const signedLicense = `${encryptedLicense}\n${signature}`;

    return Buffer.from(signedLicense, 'utf8').toString('base64');
  }

  /**
   * Get the public key for client embedding
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get the license encryption key for client embedding
   */
  getLicenseEncryptionKey(): string {
    return this.licenseEncryptionKey;
  }

  /**
   * Verify license signature (for testing purposes)
   */
  verifyLicenseSignature(encryptedLicense: string, signature: string): boolean {
    try {
      const verifier = crypto.createVerify('sha256');
      verifier.update(encryptedLicense);
      verifier.end();
      return verifier.verify(this.publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Decrypt license file (for testing purposes)
   */
  decryptLicenseFile(encryptedLicense: string): LicenseData | null {
    try {
      const [ivHex, encrypted] = encryptedLicense.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(this.licenseEncryptionKey, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }
}
