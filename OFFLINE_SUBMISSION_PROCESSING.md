# Offline Submission Processing Implementation

## Overview

This document describes the backend implementation for processing locally stored exam submissions with advanced cheat detection capabilities. The system can handle multiple submissions from the same exam session and combines them into a single analyzed submission record.

## Architecture

### Key Components

1. **OfflineSubmissionService** (`offline-submission.service.ts`)
   - Main service for processing encrypted submissions
   - Implements cheat detection algorithms
   - Handles decryption and analysis of submission packages

2. **Schema & DTOs** (`offline-submission.schema.ts`)
   - Zod schemas for request/response validation
   - Type-safe data transfer objects

3. **Database Models** (Updated `schema.prisma`)
   - `ExamSubmission` table for storing analyzed results
   - Relationships with existing exam session structures

4. **Controller Endpoints** (`student-exams.controller.ts`)
   - `/exams/student/submit-offline` - Process offline submissions
   - `/exams/student/submissions/:sessionId` - Get analysis results

## API Endpoints

### Submit Offline Submissions

**POST** `/exams/student/submit-offline`

Processes a package of locally stored submissions and creates a final submission record with cheat detection analysis.

**Request Body:**
```typescript
{
  examId: string;           // UUID of the exam
  examCode: string;         // Exam code for validation
  submissions: [            // Array of encrypted submissions
    {
      submissionId: string;
      encryptedSealedAnswers: string;    // Base64 AES-encrypted answers
      encryptedSubmissionKey: string;    // Base64 RSA-encrypted key
      sessionId?: string;                // Optional session identifier
      savedAt: string;                   // ISO timestamp
    }
  ];
  examStartTime: string;    // When exam started locally
  examEndTime: string;      // When exam ended
  clientInfo?: {            // Optional client metadata
    userAgent?: string;
    platform?: string;
    deviceId?: string;
  };
}
```

**Response:**
```typescript
{
  sessionId: string;
  submissionId: string;
  score: number;
  suspiciousLevel: number;     // 0-100 scale
  detectedAnomalies: string[];
  submissionsProcessed: number;
  message: string;
}
```

### Get Submission Analysis

**GET** `/exams/student/submissions/:sessionId`

Retrieves the analysis results for a specific exam session.

**Response:**
```typescript
{
  submissionId: string;
  sessionId: string;
  examTitle: string;
  score: number;
  suspiciousLevel: number;
  detectedAnomalies: string[];
  submissionsCount: number;
  submittedAt: string;
  analyzedAt: string;
}
```

## Cheat Detection Features

### 1. Answer Hash Verification
- Verifies the integrity of each submission's answers
- Uses SHA-256 hashing with answer canonicalization
- Detects tampering with answer data

### 2. Timestamp Integrity Analysis
- Validates submission timestamps are in chronological order
- Detects timestamp manipulation attempts
- Identifies suspicious gaps in submission timing

### 3. Mass Change Detection
- Analyzes the percentage of answers changed between submissions
- Flags submissions with >50% answer changes as suspicious
- Detects rapid mass changes (>30% changes in <2 minutes)

### 4. Auto-save Pattern Analysis
- Monitors submission intervals for irregularities
- Expected interval: ~30 seconds (auto-save frequency)
- Flags intervals >35 seconds as potentially suspicious

### 5. Inactivity Period Detection
- Identifies long periods with no answer changes
- Multiple unchanged periods indicate potential issues
- Helps detect exam abandonment or technical problems

## Suspicious Level Scoring

The system calculates a suspicious level (0-100) based on detected anomalies:

| Anomaly Type | Points Added |
|--------------|-------------|
| Answer hash verification failed | +30 |
| Timestamp manipulation | +25 |
| Mass answer changes (>50%) | +15 |
| Rapid mass changes | +20 |
| Irregular auto-save intervals | +10 |
| Long unchanged periods | +5 |

**Risk Levels:**
- 0-20: Low risk
- 21-40: Medium risk
- 41-70: High risk
- 71-100: Very high risk

## Security Features

### Encryption & Decryption
- **RSA-OAEP** encryption for submission keys
- **AES-256-GCM** encryption for sealed answers
- Private key management with environment/file fallback

### Data Integrity
- Answer canonicalization for consistent hashing
- Authenticated encryption prevents tampering
- Submission ID tracking prevents duplicates

### Access Control
- JWT authentication required
- Student role verification
- Session ownership validation

## Database Schema

### ExamSubmission Table
```sql
CREATE TABLE ExamSubmission (
  id                String PRIMARY KEY,
  sessionId         String UNIQUE REFERENCES ExamSession(id),
  finalAnswers      JSON,              -- Combined final answers
  suspiciousLevel   Int DEFAULT 0,     -- 0-100 scale
  detectedAnomalies JSON,              -- Array of anomaly descriptions
  submissionsCount  Int DEFAULT 1,     -- Number of submissions processed
  submittedAt       DateTime,          -- Final submission time
  analyzedAt        DateTime,          -- Analysis completion time
  createdAt         DateTime,
  updatedAt         DateTime
);
```

## Implementation Details

### Submission Processing Flow
1. **Validation** - Verify exam exists and user enrollment
2. **Decryption** - Decrypt all submissions using RSA private key
3. **Analysis** - Run cheat detection algorithms
4. **Combination** - Merge submissions into final answers
5. **Scoring** - Calculate exam score
6. **Storage** - Create session and submission records

### Answer Combination Strategy
Currently uses the **latest submission** as the final answer set. This can be enhanced to:
- Use most frequent answers across submissions
- Implement conflict resolution algorithms
- Weight answers by submission confidence

### Error Handling
- Graceful handling of decryption failures
- Partial processing if some submissions fail
- Detailed logging for debugging
- User-friendly error messages

## Configuration

### Environment Variables
```bash
# RSA private key for decrypting submissions
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Alternative: Load from file
# Key file path: ./keys/private.pem
```

### Dependencies
- `crypto` - Node.js cryptography
- `prisma` - Database ORM
- `nestjs-zod` - Schema validation

## Usage Example

### Client-side Submission
```typescript
// Prepare submission package
const submissionPackage = {
  examId: "exam-uuid",
  examCode: "EXAM2025001",
  submissions: storedSubmissions, // From local storage
  examStartTime: "2025-07-13T10:00:00Z",
  examEndTime: "2025-07-13T12:00:00Z"
};

// Submit to backend
const response = await fetch('/exams/student/submit-offline', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(submissionPackage)
});

const result = await response.json();
console.log('Submission processed:', result);
```

### Checking Analysis Results
```typescript
const analysis = await fetch(`/exams/student/submissions/${sessionId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const results = await analysis.json();
console.log('Suspicious level:', results.suspiciousLevel);
console.log('Detected anomalies:', results.detectedAnomalies);
```

## Testing

### Test Scenarios
1. **Normal Submissions** - Regular auto-save intervals
2. **Hash Tampering** - Modified answer hashes
3. **Timestamp Manipulation** - Out-of-order timestamps
4. **Mass Changes** - Large percentage changes
5. **Irregular Patterns** - Unusual timing patterns

### Mock Data Generation
```typescript
// Generate test submissions with different patterns
const normalSubmissions = generateNormalSubmissions();
const suspiciousSubmissions = generateSuspiciousSubmissions();
const tamperedSubmissions = generateTamperedSubmissions();
```

## Future Enhancements

### Advanced Analysis
- **Machine Learning** integration for pattern detection
- **Behavioral Analysis** based on typing patterns
- **Cross-reference Analysis** with other students

### Enhanced Security
- **Hardware attestation** for device verification
- **Biometric verification** integration
- **Network fingerprinting** for consistency checks

### Performance Optimizations
- **Streaming processing** for large submission sets
- **Parallel decryption** for faster processing
- **Caching strategies** for repeated analysis

### Reporting & Analytics
- **Instructor dashboards** for reviewing suspicious activity
- **Statistical analysis** across exam sessions
- **Automated flagging** for manual review

## Troubleshooting

### Common Issues

1. **Decryption Failures**
   - Verify RSA private key configuration
   - Check key format and encoding
   - Ensure client/server key pair match

2. **High Suspicious Levels**
   - Review detected anomalies list
   - Check client auto-save implementation
   - Verify timestamp accuracy

3. **Performance Issues**
   - Monitor submission package sizes
   - Optimize database queries
   - Consider batch processing limits

### Debug Logging
Enable detailed logging to troubleshoot issues:
```typescript
// Add to service constructor
private readonly logger = new Logger(OfflineSubmissionService.name);

// Use throughout processing
this.logger.debug('Processing submission:', submissionId);
```

## Conclusion

This implementation provides a robust, secure system for processing offline exam submissions with comprehensive cheat detection. The modular design allows for easy extension and customization based on specific requirements.

The cheat detection algorithms balance security with usability, flagging genuinely suspicious behavior while minimizing false positives from normal exam-taking patterns.
