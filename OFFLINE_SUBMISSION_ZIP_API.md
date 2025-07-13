# Offline Submission Zip Upload API

## Overview

The offline submission system has been updated to accept submissions as a single zip file containing all individual submission files, rather than an array of submissions in the request body. This approach is more efficient for handling large numbers of submissions and provides better security through file-based encryption.

## API Endpoint

**POST** `/api/exams/student/submit-offline`

### Request Format

The request must be sent as `multipart/form-data` with the following structure:

**Form Fields:**
- `examId` (string, UUID): The exam identifier
- `examCode` (string): The exam code for verification
- `examStartTime` (string, ISO datetime): When the exam session started
- `examEndTime` (string, ISO datetime): When the exam session ended
- `clientInfo[userAgent]` (string, optional): Browser user agent
- `clientInfo[platform]` (string, optional): Operating system platform
- `clientInfo[deviceId]` (string, optional): Unique device identifier

**File Upload:**
- `submissionsZip` (file): A zip archive containing the submission files

### Zip File Structure

The uploaded zip file should contain:

```
submissions.zip
├── manifest.json (optional but recommended)
├── submission_001.json
├── submission_002.json
├── submission_003.json
└── ...
```

#### manifest.json Format

```json
{
  "examId": "uuid-string",
  "sessionId": "session-uuid",
  "studentId": "student-id",
  "totalSubmissions": 3,
  "submissions": [
    {
      "submissionId": "submission-001",
      "filename": "submission_001.json",
      "savedAt": "2024-01-15T14:30:00.000Z",
      "sessionId": "session-uuid"
    },
    {
      "submissionId": "submission-002",
      "filename": "submission_002.json",
      "savedAt": "2024-01-15T14:31:00.000Z",
      "sessionId": "session-uuid"
    }
  ],
  "createdAt": "2024-01-15T14:32:00.000Z"
}
```

#### Individual Submission File Format

Each submission file (e.g., `submission_001.json`) should contain:

```json
{
  "submissionId": "submission-001",
  "encryptedSealedAnswers": "base64-encrypted-data",
  "encryptedSubmissionKey": "base64-encrypted-key",
  "sessionId": "session-uuid",
  "savedAt": "2024-01-15T14:30:00.000Z",
  "metadata": {
    "examId": "exam-uuid",
    "studentId": "student-id",
    "clientVersion": "1.0.0"
  }
}
```

## Processing Flow

1. **Upload Validation**: The server validates that the uploaded file is a valid zip archive
2. **Extraction**: The zip file is extracted and all JSON files are parsed
3. **Manifest Validation**: If present, the manifest is validated against the actual submissions
4. **Decryption**: Each submission is decrypted using the provided encryption keys
5. **Cheat Detection**: The submissions are analyzed for potential cheating patterns
6. **Combination**: Multiple submissions are combined into final answers
7. **Storage**: The analyzed results are stored in the database

## Response Format

### Success Response (200 OK)

```json
{
  "sessionId": "session-uuid",
  "submissionId": "submission-record-uuid",
  "score": 85.5,
  "suspiciousLevel": 15,
  "detectedAnomalies": [
    "Multiple rapid submissions detected",
    "Unusual answer pattern found"
  ],
  "submissionsProcessed": 3,
  "message": "Submissions processed successfully"
}
```

### Error Responses

**400 Bad Request** - Invalid zip file or missing required fields:
```json
{
  "error": "Bad Request",
  "message": "Submissions zip file is required",
  "statusCode": 400
}
```

**400 Bad Request** - Invalid file type:
```json
{
  "error": "Bad Request",
  "message": "File must be a zip archive",
  "statusCode": 400
}
```

**404 Not Found** - Exam not found:
```json
{
  "error": "Not Found",
  "message": "Exam not found",
  "statusCode": 404
}
```

## Client Implementation Example

### JavaScript/TypeScript (Browser)

```typescript
async function submitOfflineExam(
  examId: string,
  examCode: string,
  examStartTime: Date,
  examEndTime: Date,
  submissionsZipFile: File,
  clientInfo?: {
    userAgent?: string;
    platform?: string;
    deviceId?: string;
  }
) {
  const formData = new FormData();

  formData.append('examId', examId);
  formData.append('examCode', examCode);
  formData.append('examStartTime', examStartTime.toISOString());
  formData.append('examEndTime', examEndTime.toISOString());
  formData.append('submissionsZip', submissionsZipFile);

  if (clientInfo) {
    if (clientInfo.userAgent) {
      formData.append('clientInfo[userAgent]', clientInfo.userAgent);
    }
    if (clientInfo.platform) {
      formData.append('clientInfo[platform]', clientInfo.platform);
    }
    if (clientInfo.deviceId) {
      formData.append('clientInfo[deviceId]', clientInfo.deviceId);
    }
  }

  const response = await fetch('/api/exams/student/submit-offline', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}
```

### Node.js (Server-side)

```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function submitOfflineExam(zipFilePath, examData, authToken) {
  const form = new FormData();

  form.append('examId', examData.examId);
  form.append('examCode', examData.examCode);
  form.append('examStartTime', examData.examStartTime);
  form.append('examEndTime', examData.examEndTime);
  form.append('submissionsZip', fs.createReadStream(zipFilePath));

  const response = await axios.post('/api/exams/student/submit-offline', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
  });

  return response.data;
}
```

## Security Considerations

1. **File Size Limits**: The server should enforce reasonable limits on zip file size
2. **File Type Validation**: Only zip files should be accepted
3. **Content Validation**: All files within the zip must be valid JSON
4. **Encryption**: Submission data must be properly encrypted before zipping
5. **Authentication**: All requests must include valid JWT tokens
6. **Rate Limiting**: Consider implementing rate limiting for upload endpoints

## Migration from Array-based API

If you were previously using the array-based submission API, you'll need to:

1. Update your client code to create zip files instead of JSON arrays
2. Ensure all submission data is properly encrypted before adding to the zip
3. Update the API endpoint call to use multipart/form-data
4. Handle the new response format

The old array-based API has been deprecated and removed in this version.
