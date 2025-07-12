# License-Based Offline Exam Security Implementation

## Overview

This implementation introduces a license-based security system for offline exams that eliminates the need for real-time server communication during exam startup while maintaining strong security.

## Architecture Components

### 1. Key Management
- **Exam Encryption Key**: Unique symmetric key per exam (AES-256)
- **RSA Key Pair**: Public/private keys for license signing and verification
- **License Encryption Key**: Symmetric key for encrypting license files

### 2. Security Flow

#### Setup Phase (Backend)
1. **During exam creation**: Generate unique exam encryption key for each exam and store in database
2. **At application startup**: Generate RSA key pair (stored securely on server)
3. **At application startup**: Generate license encryption key (embedded in client app)

#### Prefetch Phase
1. User requests exam prefetch via `/exams/sessions/prefetch`
2. Backend validates user enrollment and exam availability
3. **Backend uses existing exam encryption key (generated during exam creation)**
4. Backend encrypts exam content with exam encryption key
5. Backend creates license file containing:
   - Exam ID and metadata
   - Exam encryption key
   - User ID and validity information
6. Backend encrypts license file with license encryption key
7. Backend signs encrypted license with private RSA key
8. Backend returns encrypted exam content + signed license

#### Exam Start Phase (Client-side)
1. Client decrypts license file using embedded license encryption key
2. Client verifies license signature using embedded public RSA key
3. Client validates license timing and user information
4. Client decrypts exam content using exam encryption key from license
5. **Client starts exam locally without any server communication**
6. **Session is created on server only when student submits first answer**

### 3. API Changes

#### New Endpoints
- `GET /exams/sessions/client-config` - Returns public key and license encryption key

#### Modified Endpoints
- `POST /exams/sessions/prefetch` - Now returns encrypted content + signed license
- `POST /exams/sessions/answer` - Now includes examCode and examStartTime, creates session if needed
- `POST /exams/sessions/sync-answers` - Now includes examCode and examStartTime, creates session if needed
- `POST /exams/sessions/end` - Now includes examCode and examStartTime, creates session if needed

#### Removed Endpoints
- `POST /exams/sessions/request-key` - No longer needed
- `POST /exams/sessions/start` - No longer needed (replaced by client-side validation)
- `POST /exams/sessions/create/{examCode}` - No longer needed (session created on first answer)

### 4. Database Changes

The `Exam` table has been updated to include an encryption key field:

```sql
ALTER TABLE "Exam" ADD COLUMN "encryptionKey" TEXT;
```

**Important**: This field is automatically populated when new exams are created. For existing exams created before this update, you may need to run a migration script to generate and populate encryption keys.

### 5. Security Benefits

1. **Complete Offline Independence**: No server communication required for exam start
2. **Tamper Protection**: Digital signatures prevent license modification
3. **Time-bound Security**: Licenses include validity periods
4. **User-specific**: Licenses are tied to specific users
5. **Forward Security**: Each exam has unique encryption keys
6. **Delayed Session Creation**: Sessions only created when answers are submitted, reducing server load
7. **Accurate Timing**: Exam start time is captured from client when exam actually starts

### 6. Client Implementation Requirements

The client application must:
1. Embed public RSA key and license encryption key at build time
2. Implement license signature verification
3. Implement license and exam content decryption
4. Validate license timing and user information
5. **Start exam locally without server communication**
6. **Include exam start time in all answer submissions**
7. **Handle session creation transparently during answer submission**

## Usage Example

```typescript
// 1. Prefetch exam
const response = await fetch('/exams/sessions/prefetch', {
  method: 'POST',
  body: JSON.stringify({ examCode: 'EXAM123' }),
  headers: { 'Authorization': 'Bearer <token>' }
});

const { encryptedExamData, signedLicense } = await response.json();

// 2. Store encrypted data locally
localStorage.setItem('exam_data', encryptedExamData);
localStorage.setItem('exam_license', signedLicense);

// 3. When starting exam (completely offline)
const license = JSON.parse(localStorage.getItem('exam_license'));
const { encryptedLicense, signature } = license;

// Verify signature with embedded public key
const isValid = verifySignature(encryptedLicense, signature, PUBLIC_KEY);

if (isValid) {
  // Decrypt license with embedded license key
  const licenseData = decryptLicense(encryptedLicense, LICENSE_KEY);

  // Validate timing and user
  if (isLicenseValid(licenseData)) {
    // Decrypt exam content
    const examData = decryptExamContent(
      localStorage.getItem('exam_data'),
      licenseData.examEncryptionKey
    );

    // Record exam start time locally
    const examStartTime = new Date().toISOString();

    // Start exam locally - NO SERVER COMMUNICATION NEEDED
    startExamUI(examData);

    // Later, when submitting answers (creates session automatically)
    await fetch('/exams/sessions/answer', {
      method: 'POST',
      body: JSON.stringify({
        examCode: 'EXAM123',
        questionId: 'question-id',
        answer: 'student answer',
        examStartTime: examStartTime
      }),
      headers: { 'Authorization': 'Bearer <token>' }
    });
  }
}
```

## Security Considerations

1. **Key Storage**: RSA private key and license encryption key must be stored securely on server
2. **Client Keys**: Public key and license encryption key embedded in client should be obfuscated
3. **License Validity**: Implement proper time validation in client
4. **Session Management**: Backend still tracks active sessions for integrity
5. **Answer Sync**: Existing answer synchronization mechanisms remain unchanged

## Migration Strategy

1. Deploy new backend code with backward compatibility
2. Run database migration to add encryption key column
3. Generate encryption keys for existing exams
4. Update client applications to use new license-based flow
5. Remove old API endpoints after client migration is complete
