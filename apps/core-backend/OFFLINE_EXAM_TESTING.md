# Offline Exam Session Testing Guide

## Overview
This guide provides instructions for testing the new offline exam session functionality.

## API Endpoints

### 1. Prefetch Exam
```http
POST /exam-sessions/prefetch
Content-Type: application/json

{
  "examId": "exam-uuid",
  "studentId": "student-uuid"
}
```

Expected Response:
```json
{
  "examData": {
    "id": "exam-uuid",
    "title": "Exam Title",
    "questions": [...],
    // ... other exam data
  },
  "encryptionKey": "base64-encoded-key",
  "checksum": "sha256-hash"
}
```

### 2. Start Offline Session
```http
POST /exam-sessions/start-offline
Content-Type: application/json

{
  "examId": "exam-uuid",
  "studentId": "student-uuid",
  "encryptionKey": "base64-encoded-key"
}
```

Expected Response:
```json
{
  "sessionId": "session-uuid",
  "examData": {
    // Encrypted exam data
  },
  "startTime": "2024-01-01T00:00:00.000Z"
}
```

### 3. Submit Offline Session
```http
POST /exam-sessions/submit-offline
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "encryptedAnswers": "base64-encrypted-answers",
  "encryptionKey": "base64-encoded-key"
}
```

Expected Response:
```json
{
  "success": true,
  "submissionId": "submission-uuid",
  "submittedAt": "2024-01-01T01:00:00.000Z"
}
```

### 4. Sync Offline Sessions
```http
POST /exam-sessions/sync-offline
Content-Type: application/json

{
  "sessions": [
    {
      "sessionId": "session-uuid",
      "encryptedAnswers": "base64-encrypted-answers",
      "encryptionKey": "base64-encoded-key",
      "completedAt": "2024-01-01T01:00:00.000Z"
    }
  ]
}
```

Expected Response:
```json
{
  "syncedSessions": 1,
  "failedSessions": 0,
  "results": [
    {
      "sessionId": "session-uuid",
      "status": "success",
      "submissionId": "submission-uuid"
    }
  ]
}
```

## Testing Steps

1. **Setup Environment**
   - Ensure `KEY_DERIVATION_SALT` is set in your `.env` file
   - Start the backend server: `npx nx serve core-backend`

2. **Test Prefetch**
   - Create an exam in the database
   - Use the prefetch endpoint with valid examId and studentId
   - Verify the response contains encrypted exam data and encryption key

3. **Test Offline Session Start**
   - Use the encryption key from prefetch
   - Start an offline session
   - Verify session is created and exam data is returned

4. **Test Offline Submission**
   - Submit answers for the offline session
   - Verify submission is recorded correctly

5. **Test Sync**
   - Create multiple offline sessions
   - Use the sync endpoint to bulk upload
   - Verify all sessions are processed correctly

## Troubleshooting

### Common Issues

1. **Missing KEY_DERIVATION_SALT**
   ```
   Error: KEY_DERIVATION_SALT environment variable is required
   ```
   Solution: Add `KEY_DERIVATION_SALT=your-secret-salt` to your `.env` file

2. **Invalid Encryption Key**
   ```
   Error: Invalid encryption key format
   ```
   Solution: Ensure the encryption key is base64 encoded

3. **Exam Not Found**
   ```
   Error: Exam not found
   ```
   Solution: Verify the examId exists in the database

4. **Student Not Found**
   ```
   Error: Student not found
   ```
   Solution: Verify the studentId exists in the database

## Security Notes

- Encryption keys are derived using PBKDF2 with the configured salt
- All sensitive data is encrypted before storage
- Checksums are used to verify data integrity
- Sessions have appropriate access controls
