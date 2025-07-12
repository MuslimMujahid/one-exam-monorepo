# CSV Exam Creation

This feature allows teachers to create exams by uploading CSV files containing questions.

## API Endpoint

**POST** `/exams/teacher/create-from-csv`

### Headers
- `Authorization: Bearer <jwt_token>`
- `Content-Type: multipart/form-data`

### Request Body
- `csvFile`: CSV file (required)
- `title`: Exam title (required)
- `description`: Exam description (optional)
- `startDate`: ISO datetime string (required)
- `endDate`: ISO datetime string (required)
- `examCode`: Unique exam code (required)
- `passKey`: Access password for exam (required)
- `status`: "DRAFT" or "PUBLISHED" (default: "DRAFT")

## CSV Format

The CSV file must contain the following columns:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| text | string | Yes | The question text |
| questionType | enum | Yes | One of: "multiple-choice-single", "multiple-choice-multiple", "text" |
| options | string | Conditional | JSON string of options array (required for multiple choice questions) |
| points | number | Yes | Points awarded for correct answer |

### Question Types

#### 1. Multiple Choice Single (multiple-choice-single)
- Allows exactly one correct answer
- Requires `options` field with JSON array of options
- Each option must have `value` (string) and `isCorrect` (boolean)
- Exactly one option must have `isCorrect: true`

**Example options:**
```json
[
  {"value": "Paris", "isCorrect": true},
  {"value": "London", "isCorrect": false},
  {"value": "Berlin", "isCorrect": false}
]
```

#### 2. Multiple Choice Multiple (multiple-choice-multiple)
- Allows multiple correct answers
- Requires `options` field with JSON array of options
- Each option must have `value` (string) and `isCorrect` (boolean)
- At least one option must have `isCorrect: true`

**Example options:**
```json
[
  {"value": "Red", "isCorrect": true},
  {"value": "Blue", "isCorrect": true},
  {"value": "Green", "isCorrect": false},
  {"value": "Yellow", "isCorrect": true}
]
```

#### 3. Text Questions (text)
- Open-ended text response
- `options` field should be empty or omitted
- Manually graded by teacher

## Sample CSV File

```csv
text,questionType,options,points
What is the capital of France?,multiple-choice-single,"[{""value"": ""Berlin"", ""isCorrect"": false}, {""value"": ""Madrid"", ""isCorrect"": false}, {""value"": ""Paris"", ""isCorrect"": true}, {""value"": ""Rome"", ""isCorrect"": false}]",5
Which of the following are primary colors?,multiple-choice-multiple,"[{""value"": ""Red"", ""isCorrect"": true}, {""value"": ""Green"", ""isCorrect"": false}, {""value"": ""Blue"", ""isCorrect"": true}, {""value"": ""Yellow"", ""isCorrect"": true}]",7
Explain the concept of photosynthesis.,text,,10
```

## Validation Rules

1. **CSV Structure**: File must be a valid CSV with proper headers
2. **Question Text**: Must be non-empty string
3. **Question Type**: Must be one of the supported types
4. **Points**: Must be a positive integer
5. **Options Validation**:
   - Required for multiple choice questions
   - Must be valid JSON array
   - Each option must have `value` and `isCorrect` properties
   - At least 2 options required for multiple choice
   - Single choice: exactly 1 correct answer
   - Multiple choice: at least 1 correct answer

## Error Handling

The API will return detailed validation errors if:
- CSV format is invalid
- Required fields are missing
- Question types are invalid
- Options JSON is malformed
- Validation rules are violated

Errors will include the row number and specific issue for easy debugging.

## Example cURL Request

```bash
curl -X POST http://localhost:3000/exams/teacher/create-from-csv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "csvFile=@questions.csv" \
  -F "title=Math Quiz" \
  -F "description=Basic mathematics questions" \
  -F "startDate=2025-01-15T09:00:00Z" \
  -F "endDate=2025-01-15T11:00:00Z" \
  -F "examCode=MATH001" \
  -F "passKey=secret123" \
  -F "status=DRAFT"
```

## Response

On success, returns the created exam object with all questions included:

```json
{
  "id": "exam_id",
  "title": "Math Quiz",
  "description": "Basic mathematics questions",
  "startDate": "2025-01-15T09:00:00Z",
  "endDate": "2025-01-15T11:00:00Z",
  "examCode": "MATH001",
  "passKey": "secret123",
  "status": "DRAFT",
  "userId": "user_id",
  "questions": [
    {
      "id": "question_id",
      "text": "What is 2 + 2?",
      "questionType": "multiple-choice-single",
      "options": [...],
      "points": 5,
      "examId": "exam_id"
    }
  ]
}
```
