# 🐛 Root Cause Analysis: Base64 vs Raw Bytes Issue

## **The Problem**

The issue was in the client's `crypto.ts` file at line 455:

```typescript
// ❌ WRONG - This created the problem
static generateSubmissionKey(): string {
    return crypto.randomBytes(32).toString('base64');
}
```

## **Why This Failed**

### The Problematic Flow:
1. **Client**: Generate 32 random bytes → Convert to base64 string (44 chars)
2. **Client**: RSA encrypt the base64 **string** (not the original 32 bytes)
3. **Backend**: RSA decrypt → Get the base64 string back
4. **Backend**: Try to use the base64 string as if it were the original 32 bytes
5. **Backend**: `Buffer.from(base64String, 'base64')` → Double-decode issue

### Visual Example:
```javascript
// Original 32 bytes: [0x1A, 0x2B, 0x3C, ..., 0xFF] (32 bytes)
// Base64 string: "Gis8...=" (44 characters)
// RSA encrypts: The 44-character STRING, not the original 32 bytes
// Backend gets: The 44-character string back
// Backend tries: Buffer.from("Gis8...=", 'base64') → Wrong key!
```

## **The Solution**

### Fixed Client Code:
```typescript
// ✅ CORRECT - Work with raw bytes throughout
static generateSubmissionKey(): Buffer {
    return crypto.randomBytes(32);
}

static encryptSealedAnswers(sealedAnswers: ExamSubmissionData, submissionKey: Buffer): string {
    // Use submissionKey directly as Buffer
    const cipher = crypto.createCipheriv(this.AES_ALGORITHM, submissionKey, iv);
}

static encryptSubmissionKey(submissionKey: Buffer): string {
    // Encrypt the raw bytes directly
    const encrypted = crypto.publicEncrypt({...}, submissionKey);
}
```

### Fixed Backend Code:
```typescript
// ✅ CORRECT - Return and use raw bytes
private decryptSubmissionKey(encryptedKey: string): Buffer {
    const decrypted = crypto.privateDecrypt({...}, buffer);
    return decrypted; // Raw bytes, not base64 string
}

private decryptSealedAnswers(encryptedData: string, submissionKey: Buffer): DecryptedSubmission {
    // Use submissionKey directly as Buffer
    const decipher = crypto.createDecipheriv('aes-256-gcm', submissionKey, iv);
}
```

## **Key Lesson**

**Never mix string encoding with raw cryptographic operations.**

- Generate keys as raw bytes
- Encrypt raw bytes with RSA
- Use raw bytes for AES operations
- Only convert to strings for transmission/storage (final step)

The RSA encryption should always operate on the **actual key material** (32 raw bytes), not on a text representation (44-character base64 string) of that key material.

## **Test Results After Fix**

```
✅ RSA encryption/decryption works correctly
✅ AES encryption/decryption works correctly
✅ End-to-end submission flow simulation passes
✅ Data integrity verification passes
✅ Backend builds successfully
```

This fix ensures that:
1. Client generates 32-byte keys
2. Client encrypts the raw 32 bytes with RSA
3. Backend decrypts and gets the raw 32 bytes back
4. Backend uses the raw 32 bytes for AES decryption
5. Everything works as intended! 🎉
