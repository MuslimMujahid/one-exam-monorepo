/**
 * This file generates a new RSA key pair and a license key and
 * writes them to the appropriate directories.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating new RSA key pair...');

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});
console.log('✅ RSA key pair generated successfully');

// Generate license key
console.log('🔑 Generating new license key...');
const licenseKey = crypto.randomBytes(32).toString('hex');
console.log('✅ License key generated successfully');


// Write private key to backend keys directory
const backendPrivateKeyPath = path.join(__dirname, '..', 'apps', 'core-backend', 'src', 'keys', 'private.pem');
fs.writeFileSync(backendPrivateKeyPath, privateKey);
console.log('✅ Private key written to:', backendPrivateKeyPath);

// Write public key to backend keys directory
const backendPublicKeyPath = path.join(__dirname, '..', 'apps', 'core-backend', 'src', 'keys', 'public.pem');
fs.writeFileSync(backendPublicKeyPath, publicKey);
console.log('✅ Public key written to:', backendPublicKeyPath);

// Write license key to backend keys directory
const backendLicenseKeyPath = path.join(__dirname, '..', 'apps', 'core-backend', 'src', 'keys', 'license.key');
fs.writeFileSync(backendLicenseKeyPath, licenseKey);
console.log('✅ License key written to:', backendLicenseKeyPath);

// Write public key to Electron keys directory
const electronPublicKeyPath = path.join(__dirname, '..', 'apps', 'student-client-electron', 'src', 'keys', 'public.pem');
fs.writeFileSync(electronPublicKeyPath, publicKey);
console.log('✅ Public key written to:', electronPublicKeyPath);

// Write license key to Electron keys directory
const electronLicenseKeyPath = path.join(__dirname, '..', 'apps', 'student-client-electron', 'src', 'keys', 'license.key');
fs.writeFileSync(electronLicenseKeyPath, licenseKey);
console.log('✅ License key written to:', electronLicenseKeyPath);

console.log('\n🎉 All keys have been synchronized!');
console.log('\n📋 Key locations updated:');
console.log('- Backend private key:', backendPrivateKeyPath);
console.log('- Backend public key:', backendPublicKeyPath);
console.log('- Electron public key:', electronPublicKeyPath);
console.log('- Electron license key:', electronLicenseKeyPath);

console.log('\n🔍 Public key preview:');
console.log(publicKey.substring(0, 100) + '...');
