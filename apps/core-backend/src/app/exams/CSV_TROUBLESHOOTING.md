# CSV Upload Troubleshooting Guide

## Common Issues and Solutions

### 1. **"Row NaN" errors or column mapping issues**

**Problem**: CSV columns are not being parsed correctly, questionType receiving points values, etc.

**Causes**:
- Missing or incorrect CSV headers
- Extra whitespace in headers
- Wrong column order
- BOM (Byte Order Mark) in UTF-8 files

**Solutions**:
1. **Check headers exactly match**: `text,questionType,options,points`
2. **Remove extra spaces** around headers and values
3. **Save CSV as UTF-8 without BOM** (in Excel: Save As > More options > Tools > Web Options > Encoding > UTF-8)
4. **Use proper CSV format** - no extra commas, quotes escaped properly

### 2. **"Invalid enum value" for questionType**

**Problem**: `questionType` column receiving wrong values like numbers

**Solution**: Ensure `questionType` column contains only:
- `multiple-choice-single`
- `multiple-choice-multiple`
- `text`

### 3. **"Expected number, received nan" for points**

**Problem**: Points column not parsing as numbers

**Solutions**:
- Ensure points column contains only numbers (no text, spaces, or special characters)
- Remove any thousand separators (commas)
- Use integers only (no decimals)

### 4. **JSON parsing errors in options**

**Problem**: Options field has malformed JSON

**Solutions**:
- **Double quotes**: Use `""` inside CSV, not single quotes
- **Escape properly**: `"[{""value"": ""Paris"", ""isCorrect"": true}]"`
- **Valid JSON structure**: Each option must have `value` and `isCorrect` fields
- **Boolean values**: Use `true`/`false`, not `"true"`/`"false"`

### 5. **File format errors**

**Problem**: "File must be a CSV file"

**Solutions**:
- Ensure file extension is `.csv`
- Set correct MIME type (`text/csv`)
- Don't use Excel format (`.xlsx`) - save as CSV

## Correct CSV Format Examples

### Minimal Working Example
```csv
text,questionType,options,points
What is 2+2?,multiple-choice-single,"[{""value"": ""3"", ""isCorrect"": false}, {""value"": ""4"", ""isCorrect"": true}]",5
Explain photosynthesis.,text,,10
```

### Multiple Choice Single (exactly 1 correct answer)
```csv
text,questionType,options,points
What is the capital of France?,multiple-choice-single,"[{""value"": ""Berlin"", ""isCorrect"": false}, {""value"": ""Paris"", ""isCorrect"": true}, {""value"": ""Rome"", ""isCorrect"": false}]",5
```

### Multiple Choice Multiple (1+ correct answers)
```csv
text,questionType,options,points
Select all prime numbers:,multiple-choice-multiple,"[{""value"": ""2"", ""isCorrect"": true}, {""value"": ""4"", ""isCorrect"": false}, {""value"": ""7"", ""isCorrect"": true}]",10
```

### Text Question (no options needed)
```csv
text,questionType,options,points
Explain the water cycle.,text,,15
```

## Testing Your CSV

1. **Start small**: Test with 1-2 questions first
2. **Check encoding**: Save as UTF-8 without BOM
3. **Validate JSON**: Use online JSON validator for options field
4. **Remove hidden characters**: Copy/paste to plain text editor first

## Debug Steps

1. **Check raw file**: Open CSV in text editor (not Excel) to see actual content
2. **Verify headers**: First line should be exactly: `text,questionType,options,points`
3. **Count columns**: Each row should have exactly 4 values
4. **Test options JSON**: Copy options value and validate JSON separately
5. **Check for hidden characters**: Look for unusual spaces, tabs, or line endings

## Excel/Sheets Tips

### Excel:
- Save As > CSV (Comma delimited) (*.csv)
- OR Save As > CSV UTF-8 (*.csv) - preferred

### Google Sheets:
- File > Download > Comma Separated Values (.csv)

### LibreOffice Calc:
- Save As > Text CSV, Character set: UTF-8, Field delimiter: comma

## Common Excel Issues

- **Automatic formatting**: Excel may change quotes, add spaces, or modify numbers
- **Encoding problems**: Default CSV may not be UTF-8
- **Formula conversion**: Excel might interpret JSON as formulas

**Workaround**: Create CSV in plain text editor or use specialized CSV editor.
