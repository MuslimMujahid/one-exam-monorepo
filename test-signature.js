const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing RSA signature creation and verification...');

// Load the keys
const privateKeyPath = path.join(__dirname, 'apps', 'core-backend', 'src', 'keys', 'private.pem');
const publicKeyPath = path.join(__dirname, 'apps', 'core-backend', 'src', 'keys', 'public.pem');
const licenseKeyPath = path.join(__dirname, 'apps', 'core-backend', 'src', 'keys', 'license.key');

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath) || !fs.existsSync(licenseKeyPath)) {
  console.error('❌ Key files not found!');
  console.log('Private key path:', privateKeyPath);
  console.log('Public key path:', publicKeyPath);
  console.log('License key path', licenseKeyPath)
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
const licenseKey = fs.readFileSync(licenseKeyPath, 'utf8');

console.log('✅ Keys loaded successfully');
console.log('Private key length:', privateKey.length);
console.log('Public key length:', publicKey.length);
console.log('License key length', licenseKey.length);

// Step 1: Create license (like the backend does)
console.log('\n🔐 Step 1: Creating license...');
const licenseContent = JSON.stringify({ id: "exam123", data: "examData" });

const iv = crypto.randomBytes(12); // GCM typically uses 12 bytes for IV
const key = Buffer.from(licenseKey, 'hex');
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

let encrypted = cipher.update(licenseContent, 'utf8', 'hex');
encrypted += cipher.final('hex');

// Get the authentication tag for GCM mode
const authTag = cipher.getAuthTag();

// This is the key difference - backend base64 encodes the entire iv:encrypted:authTag string
const encryptedLicense = Buffer.from(`${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`, 'utf8').toString('base64');

const signer = crypto.createSign('sha256');
signer.update(encryptedLicense);
signer.end();
const signature = signer.sign(privateKey, 'base64');
const signedLicense = `${encryptedLicense}:${signature}`;

console.log('✅ Signature created successfully');
console.log('Signature length:', signature.length);
console.log('Signature (first 50 chars):', signature.substring(0, 50));

// create function to decode signed license
function decodeSignedLicense(license) {
  // Split on the last colon to separate encrypted license from signature
  const lastColonIndex = license.lastIndexOf(':');
  const encryptedLicense = license.substring(0, lastColonIndex);
  const actualSignature = license.substring(lastColonIndex + 1);
  return { encryptedLicense, actualSignature };
}

// Step 2: Verify signature (like the Electron app does)
console.log('\n🔍 Step 2: Verifying signature...');
const testLicense = decodeSignedLicense(signedLicense);
const verifier = crypto.createVerify('sha256');
verifier.update(testLicense.encryptedLicense);
verifier.end();
const isValid = verifier.verify(publicKey, testLicense.actualSignature, 'base64');

console.log('Verification result:', isValid ? '✅ VALID' : '❌ INVALID');

// Step 3: Test with the actual signature from the exam data
console.log('\n🔍 Step 3: Testing with actual exam signature...');
const testData = 'MGRlMGQwZTA1M2U4NzU3NWM1YTdhMWExOjY2ZDNkMTIzNjJlODZjMzg3ODgwODI3MGZmNWQyYjViMWFlZGMyM2Q5YjIxYWI3MDUzNGVkODU3YTQzY2IwMDllOGZkOWUxMDhmYzkxZTcyZTJmZjE2NmY3ZWUwMjVkNmJhODFlMjhjMmI4NDdjZWNiOWQ0YjNmYTdhMWI1ZjNhNjY4MDNlNmExZmE4ZDk2NWI3YTMzOGY5N2YzYjliMjEwZjllZDQwMzg2ODk5ZDExMjI3ZmE1YjRmZWQyOWYzNzI3OTVkODA1YjQxMjQ4NjAyZjI0MDUyOTg0NmViODY1YmY5MTFhZDQwOTY0ZmMyYzc1MTUzOTI0NDA3ZDNiNTI0MDRkMzg3MDU5NjU3OTU4ZTY2ZmRmZGI2OTA1Yjc2NGZhMDEwYzhmOTAzNTY5YjNmMWRkNzFjMTJhNDVmMTQyOTZjMTBlNjdiODRkN2QzMzBlMzUyYWE1YzAyZWRhNGQ2MDRlODU1NDUwZjRiYzFjZGZkMjU5NGNiODFhZGVkMWZiNWYxYWFkZjZjYmIwMDNkZjUxMTcwYTljYWI5ZTVjYzViMDFhYWE1MmI3ZDQ3OTM5OWYzZDlmNzI0OTk4YmFhN2EyMGU4MGVkYTdhYTdmMWIyY2JiYWY2ZjRkM2Q0NmNlNTQ2YmZmYzI5MTk5Y2NjMDIzMWE4YzgyZDY3ZGYxMzExMTc4NjJjYTU2OWRkNzJmYzc4MTJkYzY1MjcwNjU0ZDM0ZGU1MDFjMDUxNDQxODRiOTNkMjRhZjdiNzdjNGQ5MjEwMmZjYjhmMDgyNmE1NTkxNGNmOWNiOTEyMjRkYzA1MWJlMjc0OTY1YmViYzU5NTkyYmY4OWU2MjdkYTYzMjA4YWMwMGZlNWRhMTA4Njg0OWQwYzMwNzBlZDk2Njc0N2RmZTM5Yzk1N2FkZDdkMWEzZTkzOWI2ZTMxODRkNmNhOGVkNTAyNDllN2QyMWE5ZTlkNDFlOGIyNjo5MWFmMjNjYWZmOTVkZjgyYzlhZThkNDViMGJjMDEyOA==:rxMhGFQTGs4TDyWr8+CB3GNgC6UuTxRF2GZPzwFfIP14KwpNICpQKtbrfj8/7SXJ8ziWcK1iwZri5xrY9sc3VMvOhSxECtSX8fSOTQEQB0vGzVq307YnoitQGu1YtvSZOiYiYJfr4Fh3HiOOqmo5JQet9jX+S6rLRzp7nHCNISO1Uj6As0GGY4xrSJFYevbJke98nWx3NwtBQKdEEgaDBCx1+rVjA8Ub/o+iseT6RWl1PJ878M+EWrQNSwaM43yzRh7AB5430/zqdhHcj8uCoHmLIAOveyv5EX8VEd5kLX4QxnrqBDtP1NdcVU8qkMh2ZAFgsi2Nn4jeT+0oThTfng==';
const actualLicense = decodeSignedLicense(testData);

const verifier2 = crypto.createVerify('sha256');
verifier2.update(actualLicense.encryptedLicense);
verifier2.end();
const isActualValid = verifier2.verify(publicKey, actualLicense.actualSignature, 'base64');

console.log('Actual signature verification result:', isActualValid ? '✅ VALID' : '❌ INVALID');
