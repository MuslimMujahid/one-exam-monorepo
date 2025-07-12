const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load the updated Electron crypto implementation
// We'll simulate what it does without importing the actual Electron app

console.log('🧪 Testing updated Electron crypto implementation...');

// Load keys from Electron app's keys directory
const electronKeysPath = 'apps/student-client-electron/src/keys';
const publicKey = fs.readFileSync(path.join(electronKeysPath, 'public.pem'), 'utf8');
const licenseKey = fs.readFileSync(path.join(electronKeysPath, 'license.key'), 'utf8');

console.log('✅ Keys loaded successfully');
console.log('Public key length:', publicKey.length);
console.log('License key length:', licenseKey.length);

// Test data that matches the real exam format
const testSignedLicense = 'MTQwZWQ2ZDc2YzRkMzk0NzQ0YmU5Njk5MDBkMWVlMzM6MjFjZmMxMGE4YmMwY2JlMGFjMmExYjVlNTg0MGNmMzc3NjJjNWY3MzU1MzNhOTA4Y2U1M2I4MTMzZTg4ZjFlZGJkMDVlZjExZjI2ZWEwNjNmY2Q1YzVmYTFiMDRhYzM5ZmFjMTZlNzU0YjZlZmQwOGUzMjI1NDliMTI0Mjk1NjcwYmRkNTAyYTIxYzg3ODMzYjNkYjA5YTM1Y2NhOTJlZjAwMDAxZTZjZjYzYWNlNDU0YTcxNDAxNjcxNGU0NDI3YzllZmY5NDRmMjc0NTQwMTc5MzA3YzQyNzU5NjYzZDkwOTE2MWQwZGJkYjc3NWEzNTFhYjZiM2E4YjYwZWU5OGRiYWIzNzY2MTY3MWNhZGY5NmQwMjU2ZmRlMWVhYWE2MjI0OTQ2ZmVjMjgyYzk0Njg2MjRmOTdiMDdhZWNkNzhiN2I4M2Y1OTAzYjlhNzNmMWE3MjYwNDFhZmJlZjYxN2EyMjM1NWZiYTI5M2RmMGUyMjcxOTcxMGY3MDM2MjZkYmRhYzljOTgxZjE3MTc2ZjU4ZGUxYmRiODhkMzUwMDVkZGYxMWI4YWQ5NzExZGY2OGU5NzM3OTA2ZGMxM2YwNDY5NmZjOGIxZjUyNjcwZDk4YmY3MGZhN2E0YzY0MmUwOThlMDFjOTJhZjMyYWE4OWQxMDRhYWQ0OGRkOGFhMjgwMjI2Yzg3NzdhOWU2NWVkYjU1NGJlYWJiNjdhNTJmMGJmYTFmMWNiN2E0MTZhYmZhZWVhYzdiZGFmZjIwNGFhOGE1ZjVlNjY3Nzk4YTA1N2JjMWVjMjdiNzE0M2FiODRlOTE4NmJlMDQwZDI0ZDBlZWY5ODcyMjlhYzhkMTFjZTViMjVhOWNkNDYyYjYyMGNiOThiNzc2ZmU2ODljMTU2ZDk4ZDY3NGI3ZDAwNzgyMTlkYTdkMTQ3NWRiM2UzMzFmMDYwOTg0Y2I4MTg0MmVmODExMGVlZDVlYTJj:pyPynwk/Cnwt1LqnStUJ+EUgG0zck+uB5D1X/bevylCJ2BS3jAegJFyFcxUeeQ1XdtJhsQzCKz5TUlN1cDr70HTqKjiArGgXNAxS4oOQ6CpvrUtw+FxQ1XnYnHBiRTCHe4R7I91zUqdENFkdgrpvbBxpB70Bg9qdHaE6RiF5QlFb/NGD4ZcM83G83iXiJeEgXi0zQ4shsPOCX531fwahLXezk2gR10IEZ5UuM5jLH63KLcXm4CrKjrSY1gUXVKD6DLcV5aVAGVfj0Bx8ybgNxy7eUT/e7e8EYn6np4eaEaDRud1+BtmKQBQlUEU3m/GjwYHr0InHSXcCf+K+gRG4fw==';

// Replicate Electron's parseSignedLicense function
function parseSignedLicense(signedLicense) {
  console.log('🔍 Parsing signed license...');
  console.log('Signed license length:', signedLicense.length);
  console.log('Signed license (first 100 chars):', signedLicense.substring(0, 100));

  // Split on the last colon to separate base64 encrypted license from signature
  const lastColonIndex = signedLicense.lastIndexOf(':');
  if (lastColonIndex === -1) {
    throw new Error('Invalid signed license format - no colon separator found');
  }

  const encryptedLicenseBase64 = signedLicense.substring(0, lastColonIndex);
  const signature = signedLicense.substring(lastColonIndex + 1);

  console.log('📝 Encrypted license (base64) length:', encryptedLicenseBase64.length);
  console.log('📝 Signature length:', signature.length);
  console.log('📝 Encrypted license (first 50 chars):', encryptedLicenseBase64.substring(0, 50));
  console.log('📝 Signature (first 50 chars):', signature.substring(0, 50));

  return {
    encryptedLicense: encryptedLicenseBase64,
    signature: signature
  };
}

// Replicate Electron's verifyLicenseSignature function
function verifyLicenseSignature(encryptedLicenseBase64, signature, publicKey) {
  console.log('🔐 Starting signature verification...');

  // Verify signature using the same approach as test-signature.js
  const verifier = crypto.createVerify('sha256');
  verifier.update(encryptedLicenseBase64);
  verifier.end();

  const isValid = verifier.verify(publicKey, signature, 'base64');
  console.log('Signature verification result:', isValid ? '✅ VALID' : '❌ INVALID');

  return isValid;
}

// Replicate Electron's decryptLicenseFile function
function decryptLicenseFile(encryptedLicenseBase64, licenseEncryptionKey) {
  console.log('🔓 Starting license decryption...');

  try {
    // First decode the base64 to get the iv:encrypted format
    const ivAndEncrypted = Buffer.from(encryptedLicenseBase64, 'base64').toString('utf8');
    console.log('Decoded iv:encrypted format:', ivAndEncrypted.substring(0, 100) + '...');

    const [ivHex, encrypted] = ivAndEncrypted.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted license format after base64 decode');
    }

    console.log('IV (hex) length:', ivHex.length);
    console.log('Encrypted data length:', encrypted.length);

    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(licenseEncryptionKey, 'hex');

    if (iv.length !== 16 || key.length !== 32) {
      throw new Error(`Invalid key or IV length - IV: ${iv.length}, Key: ${key.length}`);
    }

    console.log('✅ IV and key lengths are valid');

    // Try GCM decryption without auth tag first (like the backend seems to do)
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('✅ GCM decryption successful (without auth tag)');
      const parsedLicense = JSON.parse(decrypted);
      console.log('✅ License JSON parsing successful');
      console.log('License exam ID:', parsedLicense.examId);
      console.log('License exam title:', parsedLicense.examTitle);
      return parsedLicense;
    } catch (gcmError) {
      console.log('❌ GCM decryption without auth tag failed:', gcmError.message);

      // Try CBC mode as fallback (maybe backend is using CBC despite the constant)
      try {
        console.log('🔄 Trying CBC decryption as fallback...');
        const decipher3 = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted3 = decipher3.update(encrypted, 'hex', 'utf8');
        decrypted3 += decipher3.final('utf8');

        console.log('✅ CBC decryption successful');
        const parsedLicense = JSON.parse(decrypted3);
        console.log('✅ License JSON parsing successful');
        console.log('License exam ID:', parsedLicense.examId);
        console.log('License exam title:', parsedLicense.examTitle);
        return parsedLicense;
      } catch (cbcError) {
        console.log('❌ CBC decryption also failed:', cbcError.message);

        // Try extracting auth tag from the encrypted data
        const encryptedBuffer = Buffer.from(encrypted, 'hex');

        // For GCM, the auth tag is typically the last 16 bytes
        const authTagLength = 16;
        if (encryptedBuffer.length > authTagLength) {
          const ciphertext = encryptedBuffer.slice(0, -authTagLength);
          const authTag = encryptedBuffer.slice(-authTagLength);

          console.log('🔄 Trying GCM with extracted auth tag...');
          console.log('Ciphertext length:', ciphertext.length);
          console.log('Auth tag length:', authTag.length);

          const decipher2 = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher2.setAuthTag(authTag);

          let decrypted2 = decipher2.update(ciphertext, null, 'utf8');
          decrypted2 += decipher2.final('utf8');

          console.log('✅ GCM decryption with auth tag successful');
          const parsedLicense = JSON.parse(decrypted2);
          console.log('✅ License JSON parsing successful');
          console.log('License exam ID:', parsedLicense.examId);
          console.log('License exam title:', parsedLicense.examTitle);
          return parsedLicense;
        } else {
          throw gcmError;
        }
      }
    }
  } catch (error) {
    console.error('❌ License decryption failed:', error.message);
    throw error;
  }
}

// Test the full flow
try {
  console.log('\n🎯 Step 1: Parse signed license...');
  const licenseComponents = parseSignedLicense(testSignedLicense);

  console.log('\n🎯 Step 2: Verify signature...');
  const signatureValid = verifyLicenseSignature(
    licenseComponents.encryptedLicense,
    licenseComponents.signature,
    publicKey
  );

  if (!signatureValid) {
    throw new Error('Signature verification failed');
  }

  console.log('\n🎯 Step 3: Decrypt license...');
  const licenseData = decryptLicenseFile(
    licenseComponents.encryptedLicense,
    licenseKey
  );

  console.log('\n🎉 SUCCESS! Full Electron crypto flow completed successfully!');
  console.log('📋 License data:', {
    examId: licenseData.examId,
    examTitle: licenseData.examTitle,
    examCode: licenseData.examCode,
    startDate: licenseData.startDate,
    endDate: licenseData.endDate,
    userId: licenseData.userId
  });

} catch (error) {
  console.error('\n💥 FAILED:', error.message);
  process.exit(1);
}
