/**
 * Production simulation test for the offline submission service
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function simulateOfflineSubmission() {
    console.log('🧪 Simulating an offline submission...');

    try {
        // Load keys (simulating what the backend would do)
        const backendPrivateKeyPath = path.join(__dirname, 'apps', 'core-backend', 'src', 'keys', 'private.pem');
        const clientPublicKeyPath = path.join(__dirname, 'apps', 'student-client-electron', 'src', 'keys', 'public.pem');

        const backendPrivateKey = fs.readFileSync(backendPrivateKeyPath, 'utf8');
        const clientPublicKey = fs.readFileSync(clientPublicKeyPath, 'utf8');

        // Simulate client creating submission data
        const submissionData = {
            examId: 'exam-123',
            studentId: 'student-456',
            answers: {
                1: { questionId: 1, answer: 'Paris', timeSpent: 15 },
                2: { questionId: 2, answer: 'Blue whale', timeSpent: 12 },
                3: { questionId: 3, answer: '42', timeSpent: 8 }
            },
            finalAnswersHash: crypto.createHash('sha256').update(JSON.stringify({
                1: 'Paris', 2: 'Blue whale', 3: '42'
            })).digest('hex'),
            sealingTimestamp: new Date().toISOString()
        };

        console.log('📋 Created submission data for', submissionData.answers.length || Object.keys(submissionData.answers).length, 'questions');

        // Step 1: Client encrypts with AES (like the client would do)
        const submissionKey = crypto.randomBytes(32); // Raw bytes, not base64!
        const iv = crypto.randomBytes(12);

        const cipher = crypto.createCipheriv('aes-256-gcm', submissionKey, iv);
        const plaintext = JSON.stringify(submissionData);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        const sealedAnswers = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
        console.log('🔒 AES encrypted answers (length:', sealedAnswers.length, ')');

        // Step 2: Client encrypts the submission key with RSA (like the client would do)
        const encryptedSubmissionKey = crypto.publicEncrypt(
            {
                key: clientPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            submissionKey
        ).toString('base64');

        console.log('🔒 RSA encrypted submission key (length:', encryptedSubmissionKey.length, ')');

        // Step 3: Backend decrypts the submission key (like our service would do)
        const decryptedSubmissionKey = crypto.privateDecrypt(
            {
                key: backendPrivateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            Buffer.from(encryptedSubmissionKey, 'base64')
        );

        console.log('🔓 Backend decrypted submission key successfully');

        // Step 4: Backend decrypts the answers (like our service would do)
        const [ivHex, encryptedHex, authTagHex] = sealedAnswers.split(':');
        const decipher = crypto.createDecipheriv('aes-256-gcm', decryptedSubmissionKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const decryptedSubmissionData = JSON.parse(decrypted);
        console.log('🔓 Backend decrypted answers successfully');

        // Step 5: Verify data integrity
        const answersMatch = JSON.stringify(submissionData) === JSON.stringify(decryptedSubmissionData);
        if (answersMatch) {
            console.log('✅ Data integrity verified - original and decrypted data match');
        } else {
            console.error('❌ Data integrity failed - data does not match');
            return false;
        }

        // Step 6: Simulate answer hash verification
        const decryptedAnswers = {};
        Object.keys(decryptedSubmissionData.answers).forEach(key => {
            decryptedAnswers[key] = decryptedSubmissionData.answers[key].answer;
        });

        const computedHash = crypto.createHash('sha256').update(JSON.stringify(decryptedAnswers)).digest('hex');
        const hashMatches = computedHash === decryptedSubmissionData.finalAnswersHash;

        if (hashMatches) {
            console.log('✅ Answer hash verification passed');
        } else {
            console.error('❌ Answer hash verification failed');
            console.log('Expected:', decryptedSubmissionData.finalAnswersHash);
            console.log('Computed:', computedHash);
            return false;
        }

        console.log('🎉 Offline submission simulation completed successfully!');
        console.log('📊 Summary:');
        console.log('  - Exam ID:', decryptedSubmissionData.examId);
        console.log('  - Student ID:', decryptedSubmissionData.studentId);
        console.log('  - Questions answered:', Object.keys(decryptedSubmissionData.answers).length);
        console.log('  - Sealing timestamp:', decryptedSubmissionData.sealingTimestamp);

        // Step 7: Test decrypt submission key with real data
        const actualEncryptedKey = "qTDbvQj9Xc18c/G13QT+R/L9VvNY01VkbuV4KRI9NuD6AW6uAUgr+tFBHvzRULVzMwHdpTAWplZIdBvZ85FSLfyc51x7cmallOnEZWMGnmeAmAfld1Yswa9W27TrFFQZy2b/bFXwVNsaxQGpDv3VCE/LcxMllrFjrpgFUFvb668y46++gZEzhjnmGHZeEnBi0o0De3LlkrYQXf6Lln6OO2a5clsuhyXQfzKuaHP95vFBT7svuDmaH2gyjoOQgP3oV+xvEstMV3Jd+Rmmm97QvcSIAblFOFVCfMhGihzQmezUGuLw7nVBpYj57VlkLOvbjCAD6nV6KaO8emo24EEbvg=="
        console.log("private key:", backendPrivateKey)
        const decryptedActualSubmissionKey = crypto.privateDecrypt(
            {
                key: backendPrivateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            Buffer.from(actualEncryptedKey, 'base64')
        );

        console.log('🔓 Decrypted actual submission key successfully');
        console.log(decryptedActualSubmissionKey)


        return true;

    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

if (require.main === module) {
    simulateOfflineSubmission().then(success => {
        if (success) {
            console.log('\n✅ The offline submission process should work correctly!');
        } else {
            console.log('\n❌ Issues detected in the offline submission process.');
        }
    });
}

module.exports = { simulateOfflineSubmission };
