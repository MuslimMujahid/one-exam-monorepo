# Offline Exam Submission Implementation

## Overview

This document describes the secure offline exam submission mechanism implemented for the One Exam monorepo. The system ensures that exam submissions are encrypted, tamper-proof, and can be safely stored locally before being uploaded to the backend when internet connectivity is restored.

## Architecture

### Key Components

1. **ElectronCrypto Class** (`apps/student-client-electron/src/app/lib/crypto.ts`)
   - Handles all cryptographic operations
   - Provides submission encryption and key management
   - Implements answer canonicalization and hashing

2. **Submission Manager** (`apps/student-client/src/pages/SubmissionManager.tsx`)
   - UI for managing stored submissions
   - Development tools for testing encryption
   - View and delete locally stored submissions

3. **ExamPage Integration** (`apps/student-client/src/pages/ExamPage.tsx`)
   - Modified to use secure submission process
   - Handles both manual and automatic (time-based) submission

4. **IPC Handlers** (`apps/student-client-electron/src/app/events/electron.events.ts`)
   - Bridge between frontend and Electron backend
   - Handles submission creation and local storage

## Security Implementation

### Encryption Process

1. **Unique Submission Key Generation**
   ```typescript
   const submissionKey = crypto.randomBytes(32).toString('base64');
   ```

2. **Sealed Answers Package Creation**
   ```typescript
   interface ExamSubmissionData {
     examId: string;
     studentId: string;
     answers: Record<number, Answer>;
     finalAnswersHash: string;  // Tamper detection
     sealingTimestamp: string;
   }
   ```

3. **Answer Canonicalization**
   - Sorts questions by ID for consistent ordering
   - Normalizes string answers (trim whitespace)
   - Sorts array answers for multiple choice questions
   - Ensures consistent data types

4. **Encryption Steps**
   - Sealed answers → AES-256-GCM encryption with submission key
   - Submission key → RSA-OAEP encryption with embedded public key
   - Both components stored locally for later upload

### Data Integrity

- **Answer Hashing**: SHA-256 hash of canonicalized answers for tamper detection
- **Authenticated Encryption**: AES-GCM provides both confidentiality and integrity
- **Timestamping**: Immutable sealing timestamp prevents replay attacks

## Files Modified/Created

### New Files
- `apps/student-client-electron/src/app/lib/submission-test-utils.ts` - Testing utilities
- `apps/student-client/src/pages/SubmissionManager.tsx` - Submission management UI

### Modified Files
- `apps/student-client-electron/src/app/lib/crypto.ts` - Added submission crypto functions
- `apps/student-client-electron/src/app/api/main.preload.ts` - Added submission APIs
- `apps/student-client-electron/src/app/events/electron.events.ts` - Added IPC handlers
- `apps/student-client/src/pages/ExamPage.tsx` - Integrated secure submission
- `apps/student-client/src/types/index.ts` - Added submission type definitions

## API Reference

### Electron APIs (Preload)

```typescript
window.electron.createEncryptedSubmission(
  examId: string,
  studentId: string,
  answers: Record<number, Answer>
): Promise<EncryptedSubmissionPackage>

window.electron.saveSubmissionLocally(
  submissionId: string,
  encryptedSubmission: EncryptedSubmissionPackage
): Promise<boolean>

window.electron.getStoredSubmissions(): Promise<StoredSubmission[]>

window.electron.clearStoredSubmission(submissionId: string): Promise<boolean>

window.electron.testSubmissionEncryption(): Promise<{success: boolean, message: string}>
```

### Data Structures

```typescript
interface EncryptedSubmissionPackage {
  encryptedSealedAnswers: string;    // Base64 AES-encrypted sealed answers
  encryptedSubmissionKey: string;    // Base64 RSA-encrypted submission key
  submissionId: string;              // Unique hex identifier
}

interface StoredSubmission extends EncryptedSubmissionPackage {
  savedAt: string;                   // ISO timestamp when saved locally
}
```

## Local Storage

Submissions are stored in the user's application data directory:
- **Windows**: `%APPDATA%/one-exam-electron/submissions/`
- **macOS**: `~/Library/Application Support/one-exam-electron/submissions/`
- **Linux**: `~/.config/one-exam-electron/submissions/`

Each submission is saved as `{submissionId}.json` containing the encrypted package plus metadata.

## Testing

The implementation includes comprehensive testing utilities:

1. **Answer Canonicalization Tests** - Verify consistent hashing
2. **Multiple Choice Ordering Tests** - Ensure array sorting works
3. **Full Encryption Tests** - End-to-end encryption validation
4. **Package Structure Validation** - Verify data integrity

Run tests from the Submission Manager UI or access via the Electron API.

## Error Handling

- **Missing Dependencies**: Graceful fallback when Electron APIs unavailable
- **Encryption Failures**: Detailed error logging and user feedback
- **Storage Issues**: Automatic directory creation and permission handling
- **Data Validation**: Comprehensive input validation and type checking

## Future Considerations

### Backend Integration
When implementing the backend upload functionality:

1. **Endpoint**: Create `/api/submissions/upload` endpoint
2. **Decryption**: Use private key to decrypt submission keys
3. **Validation**: Verify answer hashes match decrypted content
4. **Deduplication**: Check submission IDs to prevent duplicates

### Connectivity Detection
Consider implementing:
- Network status monitoring
- Automatic upload when connectivity restored
- Upload progress indicators
- Retry mechanisms for failed uploads

### Additional Security
Potential enhancements:
- Certificate pinning for RSA public key validation
- Additional metadata encryption (exam metadata, timing data)
- Submission batching for efficiency
- Local submission expiry/cleanup

## Troubleshooting

### Common Issues

1. **"Electron not available"** - Application not running in Electron context
2. **"Failed to encrypt"** - Missing or corrupted public key
3. **"Permission denied"** - Insufficient file system permissions
4. **"Invalid format"** - Corrupted encryption data

### Debug Tools

Use the Submission Manager's test functionality to validate:
- Encryption/decryption process
- Answer canonicalization
- Package structure integrity
- File system operations

## Conclusion

This implementation provides a robust, secure offline submission mechanism that:
- Protects student data with enterprise-grade encryption
- Prevents tampering through cryptographic hashes
- Ensures submissions can be safely stored and transmitted
- Provides comprehensive testing and debugging tools
- Maintains compatibility with the existing exam system
