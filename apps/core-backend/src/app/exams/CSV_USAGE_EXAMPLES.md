# CSV Upload Example Usage

## 1. Using curl with a CSV file

Create a test CSV file (`test-questions.csv`):
```csv
text,questionType,options,points
What is the capital of France?,multiple-choice-single,"[{""value"": ""Berlin"", ""isCorrect"": false}, {""value"": ""Madrid"", ""isCorrect"": false}, {""value"": ""Paris"", ""isCorrect"": true}, {""value"": ""Rome"", ""isCorrect"": false}]",5
Which of the following are primary colors?,multiple-choice-multiple,"[{""value"": ""Red"", ""isCorrect"": true}, {""value"": ""Green"", ""isCorrect"": false}, {""value"": ""Blue"", ""isCorrect"": true}, {""value"": ""Yellow"", ""isCorrect"": true}]",7
Explain the concept of photosynthesis.,text,,10
```

Then use curl to upload:
```bash
curl -X POST http://localhost:3000/exams/teacher/create-from-csv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "csvFile=@test-questions.csv" \
  -F "title=Sample Math Quiz" \
  -F "description=A quiz created from CSV file" \
  -F "startDate=2025-01-15T09:00:00Z" \
  -F "endDate=2025-01-15T11:00:00Z" \
  -F "examCode=SAMPLE001" \
  -F "passKey=test123" \
  -F "status=DRAFT"
```

## 2. Using JavaScript/TypeScript Frontend

```typescript
async function uploadCsvExam(csvFile: File, examData: any, token: string) {
  const formData = new FormData();

  // Add the CSV file
  formData.append('csvFile', csvFile);

  // Add exam metadata
  formData.append('title', examData.title);
  formData.append('description', examData.description);
  formData.append('startDate', examData.startDate);
  formData.append('endDate', examData.endDate);
  formData.append('examCode', examData.examCode);
  formData.append('passKey', examData.passKey);
  formData.append('status', examData.status);

  try {
    const response = await fetch('/api/exams/teacher/create-from-csv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Exam created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error uploading CSV exam:', error);
    throw error;
  }
}

// Usage example
const examData = {
  title: 'Science Quiz',
  description: 'Basic science questions',
  startDate: '2025-01-20T10:00:00Z',
  endDate: '2025-01-20T12:00:00Z',
  examCode: 'SCI001',
  passKey: 'science123',
  status: 'DRAFT'
};

// Assuming you have a file input element
const fileInput = document.getElementById('csvFile') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  uploadCsvExam(file, examData, 'your-jwt-token')
    .then(result => console.log('Success:', result))
    .catch(error => console.error('Error:', error));
}
```

## 3. Expected Response

On successful upload, you'll receive a response like:

```json
{
  "id": "cm52abc123def456",
  "title": "Science Quiz",
  "description": "Basic science questions",
  "startDate": "2025-01-20T10:00:00.000Z",
  "endDate": "2025-01-20T12:00:00.000Z",
  "examCode": "SCI001",
  "passKey": "science123",
  "status": "DRAFT",
  "userId": "user123",
  "createdAt": "2025-07-12T10:30:00.000Z",
  "updatedAt": "2025-07-12T10:30:00.000Z",
  "questions": [
    {
      "id": "qst123",
      "text": "What is the capital of France?",
      "questionType": "multiple-choice-single",
      "points": 5,
      "attachments": [],
      "options": [
        { "value": "Berlin", "isCorrect": false },
        { "value": "Madrid", "isCorrect": false },
        { "value": "Paris", "isCorrect": true },
        { "value": "Rome", "isCorrect": false }
      ],
      "examId": "cm52abc123def456"
    },
    {
      "id": "qst124",
      "text": "Which of the following are primary colors?",
      "questionType": "multiple-choice-multiple",
      "points": 7,
      "attachments": [],
      "options": [
        { "value": "Red", "isCorrect": true },
        { "value": "Green", "isCorrect": false },
        { "value": "Blue", "isCorrect": true },
        { "value": "Yellow", "isCorrect": true }
      ],
      "examId": "cm52abc123def456"
    },
    {
      "id": "qst125",
      "text": "Explain the concept of photosynthesis.",
      "questionType": "text",
      "points": 10,
      "attachments": [],
      "examId": "cm52abc123def456"
    }
  ]
}
```

## 4. Error Handling Examples

### Invalid CSV Format
```json
{
  "statusCode": 400,
  "message": "Failed to process CSV file: CSV validation errors:\nRow 2: Required field 'text' is missing\nRow 3: Invalid questionType 'invalid-type'"
}
```

### Missing File
```json
{
  "statusCode": 400,
  "message": "CSV file is required"
}
```

### Invalid Options JSON
```json
{
  "statusCode": 400,
  "message": "Failed to process CSV file: CSV validation errors:\nRow 2: Invalid JSON format in options field"
}
```

## 5. Validation Notes

- CSV must have headers: `text`, `questionType`, `options`, `points`
- Text questions don't need options (can be empty)
- Multiple choice questions must have valid JSON options array
- Single choice must have exactly 1 correct answer
- Multiple choice must have at least 1 correct answer
- Points must be positive integers
- File must be a CSV file (.csv extension or text/csv mimetype)
