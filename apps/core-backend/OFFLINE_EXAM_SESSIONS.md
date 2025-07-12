# Offline Exam Session Management

This document describes the offline exam session management system implemented in the core-backend.

## Overview

The offline exam session management allows students to:
1. **Prefetch exams** - Download encrypted exam data for offline use
2. **Request decryption keys** - Get keys when it's time to start the exam
3. **Take exams offline** - Complete exams without internet connectivity
4. **Sync answers** - Upload answers when connectivity is restored

## API Endpoints

### 1. Prefetch Exam
**POST** `/exams/sessions/prefetch`

Request body:
```json
{
  "examCode": "EXAM2025001"
}
```

Response:
```json
{
  "examCode": "EXAM2025001",
  "encryptedData": "iv::encryptedExamData",
  "checksum": "sha256_checksum",
  "prefetchedAt": "2025-07-12T10:00:00Z"
}
```

### 2. Request Decryption Key
**POST** `/exams/sessions/request-key`

Request body:
```json
{
  "examCode": "EXAM2025001",
  "deviceId": "unique-device-identifier"
}
```

Response:
```json
{
  "decryptionKey": "generated_key_hash",
  "examId": "uuid",
  "timeRemaining": 3600000
}
```

### 3. Start Exam Session
**POST** `/exams/sessions/start`

Request body:
```json
{
  "examCode": "EXAM2025001",
  "decryptionKey": "received_key_from_step_2"
}
```

Response:
```json
{
  "sessionId": "session_uuid",
  "examId": "exam_uuid",
  "startTime": "2025-07-12T11:00:00Z",
  "timeRemaining": 3600000,
  "message": "Exam session started successfully in offline mode"
}
```

### 4. Submit Single Answer (Optional - for real-time sync)
**PUT** `/exams/sessions/{sessionId}/answer`

Request body:
```json
{
  "questionId": "question_uuid",
  "answer": "student_answer"
}
```

### 5. Sync Offline Answers
**POST** `/exams/sessions/sync-answers`

Request body:
```json
{
  "sessionId": "session_uuid",
  "answers": [
    {
      "questionId": "question_uuid",
      "answer": "student_answer",
      "submittedAt": "2025-07-12T11:30:00Z"
    }
  ]
}
```

Response:
```json
{
  "sessionId": "session_uuid",
  "syncedAnswers": 5,
  "errors": [],
  "totalAnswers": 5
}
```

### 6. End Exam Session
**POST** `/exams/sessions/end`

Request body:
```json
{
  "sessionId": "session_uuid"
}
```

Response:
```json
{
  "sessionId": "session_uuid",
  "score": 85.5,
  "totalQuestions": 10,
  "answeredQuestions": 9,
  "endTime": "2025-07-12T12:00:00Z",
  "maxScore": 100,
  "earnedScore": 85.5
}
```

## Security Features

### Encryption
- **Algorithm**: AES-256-CBC for exam data encryption
- **Key Generation**: SHA-256 hash of `examId:userId:salt`
- **IV**: Random 16-byte initialization vector for each encryption
- **Format**: `iv::encryptedData` (double colon separator)

### Access Control
- **Time-based validation**: Keys only provided during exam time window
- **User enrollment**: Only enrolled students can access exams
- **Device tracking**: Device ID logged for audit purposes
- **Session management**: Prevents multiple active sessions

## Client Implementation Guide

### 1. Exam Prefetch Flow
```typescript
// 1. Prefetch exam before exam time
const prefetchResponse = await fetch('/exams/sessions/prefetch', {
  method: 'POST',
  body: JSON.stringify({ examCode: 'EXAM2025001' }),
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
});

// 2. Store encrypted data locally
localStorage.setItem('exam_data', JSON.stringify(prefetchResponse));
```

### 2. Start Exam Flow
```typescript
// 1. Request decryption key when exam starts
const keyResponse = await fetch('/exams/sessions/request-key', {
  method: 'POST',
  body: JSON.stringify({
    examCode: 'EXAM2025001',
    deviceId: getDeviceId()
  }),
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
});

// 2. Start exam session with key
const sessionResponse = await fetch('/exams/sessions/start', {
  method: 'POST',
  body: JSON.stringify({
    examCode: 'EXAM2025001',
    decryptionKey: keyResponse.decryptionKey
  }),
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
});

// 3. Decrypt exam data locally and start exam
const examData = decryptExamData(prefetchedData, keyResponse.decryptionKey);
```

### 3. Answer Sync Flow
```typescript
// Sync answers periodically or when connectivity restored
const syncResponse = await fetch('/exams/sessions/sync-answers', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: sessionId,
    answers: collectOfflineAnswers()
  }),
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
});
```

## Environment Variables

Add to your `.env` file:
```
KEY_DERIVATION_SALT=your-unique-encryption-salt
```

## Database Schema

The existing database schema supports offline exams without modifications:
- `ExamSession` tracks offline sessions
- `ExamAnswer` stores synced answers
- `Exam.examCode` used for exam identification
- `Exam.passKey` can be used for additional security (future enhancement)

## Error Handling

Common error scenarios:
- **Exam not found**: 404 - Invalid exam code
- **Not enrolled**: 403 - User not enrolled in exam
- **Timing issues**: 400 - Exam not started/ended
- **Invalid key**: 401 - Wrong decryption key
- **Duplicate session**: 400 - Session already exists
- **Session not found**: 404 - Invalid session ID

## Future Enhancements

1. **Advanced answer evaluation**: Implement proper scoring for different question types
2. **Biometric validation**: Add face/voice recognition during offline exams
3. **Screen monitoring**: Integrate with proctoring AI for offline sessions
4. **Partial sync**: Support incremental answer synchronization
5. **Exam resume**: Allow resuming interrupted offline sessions
