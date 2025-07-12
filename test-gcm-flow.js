const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing complete GCM encryption/decryption flow...');

// Load keys from backend
const backendKeysPath = 'apps/core-backend/src/keys';
const privateKey = fs.readFileSync(path.join(backendKeysPath, 'private.pem'), 'utf8');
const publicKey = fs.readFileSync(path.join(backendKeysPath, 'public.pem'), 'utf8');
const licenseKey = fs.readFileSync(path.join(backendKeysPath, 'license.key'), 'utf8');

console.log('✅ Keys loaded successfully');
console.log('Private key length:', privateKey.length);
console.log('Public key length:', publicKey.length);
console.log('License key length:', licenseKey.length);

// Step 1: Create license data (like the backend would)
console.log('\n🔐 Step 1: Creating and encrypting license...');
const licenseData = {
  examId: 'test-exam-gcm-123',
  examEncryptionKey: crypto.randomBytes(32).toString('hex'),
  examCode: 'GCM_TEST',
  examTitle: 'GCM Encryption Test Exam',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 3600000).toISOString(),
  issuedAt: new Date().toISOString(),
  userId: 'test-user-123'
};

console.log('License data:', licenseData);

// Step 2: Encrypt license using new GCM format
const licenseContent = JSON.stringify(licenseData);
const iv = crypto.randomBytes(12); // GCM uses 12 bytes for IV
const key = Buffer.from(licenseKey, 'hex');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

let encrypted = cipher.update(licenseContent, 'utf8', 'hex');
encrypted += cipher.final('hex');

// Get the authentication tag for GCM mode
const authTag = cipher.getAuthTag();

// Format: iv:encrypted:authTag (all in hex), then base64 encode
const combined = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
const encryptedLicenseBase64 = Buffer.from(combined, 'utf8').toString('base64');

console.log('✅ License encrypted with GCM');
console.log('Encrypted license (base64):', encryptedLicenseBase64.substring(0, 100) + '...');

// Step 3: Sign the encrypted license
const signer = crypto.createSign('sha256');
signer.update(encryptedLicenseBase64);
signer.end();
const signature = signer.sign(privateKey, 'base64');
const signedLicense = `${encryptedLicenseBase64}:${signature}`;

console.log('✅ License signed');
console.log('Signature:', signature.substring(0, 50) + '...');

// Step 4: Now test decryption (like Electron would)
console.log('\n🔓 Step 2: Testing Electron-side decryption...');

// Parse signed license
function parseSignedLicense(signedLicense) {
  const lastColonIndex = signedLicense.lastIndexOf(':');
  const encryptedLicenseBase64 = signedLicense.substring(0, lastColonIndex);
  const signature = signedLicense.substring(lastColonIndex + 1);
  return { encryptedLicense: encryptedLicenseBase64, signature: signature };
}

// Verify signature
function verifyLicenseSignature(encryptedLicenseBase64, signature, publicKey) {
  const verifier = crypto.createVerify('sha256');
  verifier.update(encryptedLicenseBase64);
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64');
}

// Decrypt license
function decryptLicenseFile(encryptedLicenseBase64, licenseEncryptionKey) {
  // Decode base64 to get iv:encrypted:authTag format
  const ivEncryptedAuth = Buffer.from(encryptedLicenseBase64, 'base64').toString('utf8');
  const parts = ivEncryptedAuth.split(':');

  if (parts.length !== 3) {
    throw new Error(`Invalid encrypted license format - expected 3 parts, got ${parts.length}`);
  }

  const [ivHex, encrypted, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(licenseEncryptionKey, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  console.log('IV length:', iv.length, 'bytes');
  console.log('Key length:', key.length, 'bytes');
  console.log('Auth tag length:', authTag.length, 'bytes');

  // Decrypt using GCM with proper auth tag
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

// Test the full flow
try {
  const licenseComponents = parseSignedLicense(signedLicense);

  console.log('📝 Verifying signature...');
  const signatureValid = verifyLicenseSignature(
    licenseComponents.encryptedLicense,
    licenseComponents.signature,
    publicKey
  );

  if (!signatureValid) {
    throw new Error('Signature verification failed');
  }
  console.log('✅ Signature verification passed');

  console.log('📝 Decrypting license...');
  const decryptedLicense = decryptLicenseFile(
    licenseComponents.encryptedLicense,
    licenseKey
  );

  console.log('✅ License decryption successful!');
  console.log('📋 Decrypted license data:', {
    examId: decryptedLicense.examId,
    examTitle: decryptedLicense.examTitle,
    examCode: decryptedLicense.examCode,
    startDate: decryptedLicense.startDate,
    endDate: decryptedLicense.endDate,
    userId: decryptedLicense.userId
  });

  // Verify the data matches
  if (JSON.stringify(decryptedLicense) === JSON.stringify(licenseData)) {
    console.log('\n🎉 SUCCESS! Complete GCM encryption/decryption flow working perfectly!');
    console.log('✅ Original and decrypted data match exactly');
  } else {
    console.log('\n❌ MISMATCH: Original and decrypted data do not match');
    console.log('Original:', licenseData);
    console.log('Decrypted:', decryptedLicense);
  }

} catch (error) {
  console.error('\n💥 FAILED:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
}
