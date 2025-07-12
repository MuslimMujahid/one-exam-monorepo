# Exam Session Controller

This document describes the new exam session functionality that allows students to take and start exam sessions.

## Overview

The exam session system provides a comprehensive API for managing student exam sessions, including starting sessions, submitting answers, and ending sessions with automatic scoring.

## Features

- **Start Exam Session**: Begin a new exam session for enrolled students
- **Submit Answers**: Submit answers to questions during an active session
- **End Session**: Complete an exam session with automatic scoring
- **Session Management**: Track active sessions and prevent multiple concurrent sessions
- **Time Validation**: Enforce exam time limits and auto-end expired sessions

## API Endpoints

### 1. Start Exam Session
**POST** `/exams/sessions/start`

Starts a new exam session for a student.

**Request Body:**
```json
{
  "examId": "uuid-of-exam"
}
```

**Response:**
```json
{
  "sessionId": "uuid-of-session",
  "exam": {
    "id": "uuid-of-exam",
    "title": "Exam Title",
    "description": "Exam Description",
    "endDate": "2025-07-12T10:00:00.000Z",
    "questions": [
      {
        "id": "uuid-of-question",
        "text": "Question text",
        "questionType": "MULTIPLE_CHOICE",
        "options": {...},
        "points": 10
      }
    ]
  },
  "startTime": "2025-07-12T09:00:00.000Z"
}
```

**Validation:**
- Exam must be published and within the time window
- Student must be enrolled in the exam
- No active session can exist for the same exam

### 2. Get Active Session
**GET** `/exams/sessions/active/:examId`

Retrieves information about an active exam session.

**Response:**
```json
{
  "sessionId": "uuid-of-session",
  "exam": {
    "id": "uuid-of-exam",
    "title": "Exam Title",
    "questions": [...]
  },
  "startTime": "2025-07-12T09:00:00.000Z",
  "answers": [
    {
      "questionId": "uuid-of-question",
      "answer": "submitted-answer",
      "submittedAt": "2025-07-12T09:15:00.000Z"
    }
  ],
  "timeRemaining": 1800000
}
```

### 3. Submit Answer
**PUT** `/exams/sessions/:sessionId/answer`

Submits an answer to a question during an active session.

**Request Body:**
```json
{
  "questionId": "uuid-of-question",
  "answer": "answer-content" // Can be string, array, or object
}
```

**Response:**
```json
{
  "success": true,
  "questionId": "uuid-of-question",
  "submittedAt": "2025-07-12T09:15:00.000Z"
}
```

**Features:**
- Upserts answers (allows updating previous answers)
- Validates session is active and belongs to the user
- Validates question belongs to the exam
- Auto-ends session if exam time has expired

### 4. End Exam Session
**POST** `/exams/sessions/end`

Ends an active exam session and calculates the final score.

**Request Body:**
```json
{
  "sessionId": "uuid-of-session"
}
```

**Response:**
```json
{
  "sessionId": "uuid-of-session",
  "score": 85.5,
  "totalQuestions": 10,
  "answeredQuestions": 8,
  "endTime": "2025-07-12T09:45:00.000Z"
}
```

### 5. Get User Sessions
**GET** `/exams/sessions/user-sessions`

Retrieves all exam sessions for the current user.

**Response:**
```json
[
  {
    "sessionId": "uuid-of-session",
    "exam": {
      "id": "uuid-of-exam",
      "title": "Exam Title",
      "description": "Exam Description"
    },
    "startTime": "2025-07-12T09:00:00.000Z",
    "endTime": "2025-07-12T09:45:00.000Z",
    "status": "COMPLETED",
    "score": 85.5
  }
]
```

### 6. Get Available Exams (Enhanced Student Endpoint)
**GET** `/exams/student/available`

Retrieves exams available for taking by the current student.

**Response:**
```json
[
  {
    "id": "uuid-of-exam",
    "title": "Exam Title",
    "description": "Exam Description",
    "startDate": "2025-07-12T08:00:00.000Z",
    "endDate": "2025-07-12T10:00:00.000Z",
    "questionsCount": 10,
    "totalPoints": 100,
    "hasActiveSession": false,
    "lastSessionScore": 85.5
  }
]
```

## Database Schema Changes

### New Models

#### ExamSession
```prisma
model ExamSession {
  id        String        @id @default(uuid())
  startTime DateTime      @default(now())
  endTime   DateTime?
  status    SessionStatus @default(IN_PROGRESS)
  score     Float?
  examId    String
  exam      Exam          @relation(fields: [examId], references: [id])
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  answers   ExamAnswer[]

  @@unique([examId, userId])
}
```

#### ExamAnswer
```prisma
model ExamAnswer {
  id           String      @id @default(uuid())
  answer       Json
  submittedAt  DateTime    @default(now())
  sessionId    String
  session      ExamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questionId   String
  question     Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, questionId])
}
```

#### New Enum
```prisma
enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  EXPIRED
}
```

## Security & Authorization

- All endpoints require JWT authentication
- All endpoints are restricted to users with `STUDENT` role
- Session ownership is validated for all operations
- Exam enrollment is verified before starting sessions

## Error Handling

The API provides comprehensive error handling for common scenarios:

- **NotFoundException**: Exam or session not found
- **ForbiddenException**: User not enrolled in exam
- **BadRequestException**: Active session already exists, exam time expired, etc.

## Scoring System

The current implementation includes a basic scoring framework:
- Each question has a configurable point value
- Final score is calculated as percentage: (earned points / total points) * 100
- The `evaluateAnswer` method is a placeholder that can be customized based on question types

## Usage Flow

1. Student calls `/exams/student/available` to see available exams
2. Student calls `/exams/sessions/start` to begin an exam
3. Student repeatedly calls `/exams/sessions/:sessionId/answer` to submit answers
4. Student calls `/exams/sessions/end` to complete the exam
5. Student can call `/exams/sessions/user-sessions` to view past results

## Testing

A comprehensive test suite is included in `exam-session.controller.spec.ts` that covers:
- Starting exam sessions
- Submitting answers
- Ending exam sessions
- Error scenarios and edge cases
