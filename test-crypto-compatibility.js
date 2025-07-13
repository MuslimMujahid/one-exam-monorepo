/**
 * Test script to verify RSA encryption/decryption compatibility between client and backend
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function testRSACompatibility() {
    try {
        console.log('🔍 Testing RSA encryption/decryption compatibility...');

        // Load keys
        const backendPrivateKeyPath = path.join(__dirname, 'apps', 'core-backend', 'src', 'keys', 'private.pem');
        const backendPublicKeyPath = path.join(__dirname, 'apps', 'core-backend', 'src', 'keys', 'public.pem');
        const clientPublicKeyPath = path.join(__dirname, 'apps', 'student-client-electron', 'src', 'keys', 'public.pem');

        if (!fs.existsSync(backendPrivateKeyPath) || !fs.existsSync(backendPublicKeyPath)) {
            console.error('❌ Backend keys not found');
            return false;
        }

        if (!fs.existsSync(clientPublicKeyPath)) {
            console.error('❌ Client public key not found');
            return false;
        }

        const backendPrivateKey = fs.readFileSync(backendPrivateKeyPath, 'utf8');
        const backendPublicKey = fs.readFileSync(backendPublicKeyPath, 'utf8');
        const clientPublicKey = fs.readFileSync(clientPublicKeyPath, 'utf8');

        // Check if keys match
        if (backendPublicKey.trim() !== clientPublicKey.trim()) {
            console.error('❌ Public keys do not match!');
            console.log('Backend key (first 100 chars):', backendPublicKey.substring(0, 100));
            console.log('Client key (first 100 chars):', clientPublicKey.substring(0, 100));
            return false;
        }

        console.log('✅ Public keys match');

        // Test data (simulating a submission key)
        const testSubmissionKey = crypto.randomBytes(32).toString('base64');
        console.log('🔑 Test submission key:', testSubmissionKey);

        // Encrypt with client's method (using client public key)
        const encrypted = crypto.publicEncrypt(
            {
                key: clientPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            Buffer.from(testSubmissionKey, 'base64')
        );

        const encryptedBase64 = encrypted.toString('base64');
        console.log('🔒 Encrypted data length:', encryptedBase64.length);
        console.log('🔒 Encrypted data starts with:', encryptedBase64.substring(0, 20) + '...');

        // Decrypt with backend's method (using backend private key)
        const buffer = Buffer.from(encryptedBase64, 'base64');

        // Try with SHA-256 OAEP (should match client)
        const decrypted = crypto.privateDecrypt(
            {
                key: backendPrivateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            buffer
        );

        const decryptedSubmissionKey = decrypted.toString('base64');
        console.log('🔓 Decrypted submission key:', decryptedSubmissionKey);

        // Verify they match
        if (testSubmissionKey === decryptedSubmissionKey) {
            console.log('✅ SUCCESS! RSA encryption/decryption works correctly');
            return true;
        } else {
            console.error('❌ FAILED! Decrypted key does not match original');
            return false;
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        return false;
    }
}

// Also test AES encryption format
function testAESFormat() {
    try {
        console.log('\n🔍 Testing AES encryption format...');

        const testData = {
            examId: 'test-exam',
            studentId: 'test-student',
            answers: { 1: { questionId: 1, answer: 'test answer', timeSpent: 30 } },
            finalAnswersHash: 'test-hash',
            sealingTimestamp: new Date().toISOString()
        };

        const submissionKey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(12); // 12 bytes for GCM

        // Encrypt like client does (hex format)
        const cipher = crypto.createCipheriv('aes-256-gcm', submissionKey, iv);
        const plaintext = JSON.stringify(testData);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        const encryptedData = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
        console.log('🔒 AES encrypted format:', encryptedData.substring(0, 50) + '...');

        // Decrypt like backend should (hex format)
        const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');
        const decipher = crypto.createDecipheriv('aes-256-gcm', submissionKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const decryptedData = JSON.parse(decrypted);

        if (JSON.stringify(testData) === JSON.stringify(decryptedData)) {
            console.log('✅ SUCCESS! AES encryption/decryption works correctly');
            return true;
        } else {
            console.error('❌ FAILED! AES decrypted data does not match original');
            return false;
        }

    } catch (error) {
        console.error('❌ AES test failed with error:', error.message);
        return false;
    }
}

if (require.main === module) {
    const rsaTest = testRSACompatibility();
    const aesTest = testAESFormat();

    if (rsaTest && aesTest) {
        console.log('\n🎉 ALL TESTS PASSED! The encryption/decryption should work correctly.');
    } else {
        console.log('\n💥 SOME TESTS FAILED! Check the issues above.');
    }
}

module.exports = { testRSACompatibility, testAESFormat };
