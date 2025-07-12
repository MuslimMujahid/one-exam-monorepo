import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService, LicenseData } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate exam encryption key', () => {
    const key = service.generateExamEncryptionKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    expect(key.length).toBe(64); // 32 bytes as hex string
  });

  it('should encrypt and decrypt exam content', () => {
    const examKey = service.generateExamEncryptionKey();
    const content = JSON.stringify({
      id: 'test-exam',
      title: 'Test Exam',
      questions: [],
    });

    const encrypted = service.encryptExamContent(content, examKey);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(content);
  });

  it('should create and verify signed license', () => {
    const licenseData: LicenseData = {
      examId: 'test-exam-id',
      examEncryptionKey: service.generateExamEncryptionKey(),
      examCode: 'TEST123',
      examTitle: 'Test Exam',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600000).toISOString(),
      issuedAt: new Date().toISOString(),
      userId: 'test-user-id',
    };

    const signedLicense = service.createSignedLicense(licenseData);
    expect(signedLicense).toBeDefined();

    const parsed = JSON.parse(signedLicense);
    expect(parsed.encryptedLicense).toBeDefined();
    expect(parsed.signature).toBeDefined();

    // Verify signature
    const isValid = service.verifyLicenseSignature(
      parsed.encryptedLicense,
      parsed.signature
    );
    expect(isValid).toBe(true);
  });

  it('should decrypt license file', () => {
    const licenseData: LicenseData = {
      examId: 'test-exam-id',
      examEncryptionKey: service.generateExamEncryptionKey(),
      examCode: 'TEST123',
      examTitle: 'Test Exam',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600000).toISOString(),
      issuedAt: new Date().toISOString(),
      userId: 'test-user-id',
    };

    const licenseContent = service.createLicenseFile(licenseData);
    const encryptedLicense = service.encryptLicenseFile(licenseContent);
    const decryptedData = service.decryptLicenseFile(encryptedLicense);

    expect(decryptedData).toEqual(licenseData);
  });

  it('should provide client configuration', () => {
    const config = service.getPublicKey();
    expect(config).toBeDefined();
    expect(typeof config).toBe('string');
    expect(config).toContain('-----BEGIN PUBLIC KEY-----');

    const licenseKey = service.getLicenseEncryptionKey();
    expect(licenseKey).toBeDefined();
    expect(typeof licenseKey).toBe('string');
    expect(licenseKey.length).toBe(64); // 32 bytes as hex string
  });
});
