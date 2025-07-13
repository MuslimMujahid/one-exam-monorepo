import { ElectronCrypto, EncryptedSubmissionPackage } from './crypto';
import { canonicalizeAnswers } from '@one-exam-monorepo/utils';

/**
 * Test utilities for validating the submission encryption/decryption process
 */
export class SubmissionTestUtils {
  /**
   * Create sample answers for testing
   */
  static createSampleAnswers() {
    return {
      1: {
        questionId: 1,
        answer: 'Sample text answer',
        timeSpent: 120,
      },
      2: {
        questionId: 2,
        answer: 2, // Single choice
        timeSpent: 45,
      },
      3: {
        questionId: 3,
        answer: [1, 3, 4], // Multiple choice
        timeSpent: 90,
      },
    };
  }

  /**
   * Test the complete submission encryption process
   */
  static testSubmissionEncryption() {
    try {
      console.log('Testing submission encryption process...');

      const examId = 'test-exam-123';
      const studentId = 'test-student-456';
      const answers = this.createSampleAnswers();

      // Create encrypted submission
      const encryptedSubmission = ElectronCrypto.createEncryptedSubmission(
        examId,
        studentId,
        answers
      );

      console.log('✅ Submission encryption successful');
      console.log('Submission ID:', encryptedSubmission.submissionId);
      console.log(
        'Encrypted answers length:',
        encryptedSubmission.encryptedSealedAnswers.length
      );
      console.log(
        'Encrypted key length:',
        encryptedSubmission.encryptedSubmissionKey.length
      );

      return encryptedSubmission;
    } catch (error) {
      console.error('❌ Submission encryption failed:', error);
      throw error;
    }
  }

  /**
   * Test answer canonicalization and hashing
   */
  static testAnswerCanonicalization() {
    console.log('Testing answer canonicalization and hashing...');

    const answers1 = {
      2: {
        questionId: 2,
        answer: 'Answer 2',
        timeSpent: 30,
      },
      1: {
        questionId: 1,
        answer: 'Answer 1  ', // Extra spaces
        timeSpent: 60,
      },
    };

    const answers2 = {
      1: {
        questionId: 1,
        answer: 'Answer 1', // No extra spaces
        timeSpent: 60,
      },
      2: {
        questionId: 2,
        answer: 'Answer 2',
        timeSpent: 30,
      },
    };

    const canonical1 = canonicalizeAnswers(answers1);
    const canonical2 = canonicalizeAnswers(answers2);

    console.log('Canonical 1:', canonical1);
    console.log('Canonical 2:', canonical2);

    const hash1 = ElectronCrypto.generateAnswersHash(answers1);
    const hash2 = ElectronCrypto.generateAnswersHash(answers2);

    console.log('Hash 1:', hash1);
    console.log('Hash 2:', hash2);

    if (hash1 === hash2) {
      console.log('✅ Canonicalization working correctly - hashes match');
    } else {
      console.log('❌ Canonicalization issue - hashes differ');
    }

    return { hash1, hash2, canonical1, canonical2 };
  }

  /**
   * Test multiple choice answer ordering
   */
  static testMultipleChoiceOrdering() {
    console.log('Testing multiple choice answer ordering...');

    const answers1 = {
      1: {
        questionId: 1,
        answer: [3, 1, 2], // Different order
        timeSpent: 60,
      },
    };

    const answers2 = {
      1: {
        questionId: 1,
        answer: [1, 2, 3], // Sorted order
        timeSpent: 60,
      },
    };

    const hash1 = ElectronCrypto.generateAnswersHash(answers1);
    const hash2 = ElectronCrypto.generateAnswersHash(answers2);

    console.log('Array answers 1:', answers1[1].answer);
    console.log('Array answers 2:', answers2[1].answer);
    console.log('Hash 1:', hash1);
    console.log('Hash 2:', hash2);

    if (hash1 === hash2) {
      console.log(
        '✅ Multiple choice ordering working correctly - hashes match'
      );
    } else {
      console.log('❌ Multiple choice ordering issue - hashes differ');
    }

    return { hash1, hash2 };
  }

  /**
   * Validate submission package structure
   */
  static validateSubmissionPackage(
    encryptedSubmission: EncryptedSubmissionPackage
  ): boolean {
    try {
      console.log('Validating submission package structure...');

      // Check required fields
      if (!encryptedSubmission.submissionId) {
        throw new Error('Missing submission ID');
      }

      if (!encryptedSubmission.encryptedSealedAnswers) {
        throw new Error('Missing encrypted sealed answers');
      }

      if (!encryptedSubmission.encryptedSubmissionKey) {
        throw new Error('Missing encrypted submission key');
      }

      // Validate submission ID format (should be hex)
      if (!/^[0-9a-f]{32}$/.test(encryptedSubmission.submissionId)) {
        throw new Error('Invalid submission ID format');
      }

      // Validate encrypted answers format (should be iv:encrypted:authTag)
      const answersParts =
        encryptedSubmission.encryptedSealedAnswers.split(':');
      if (answersParts.length !== 3) {
        throw new Error('Invalid encrypted answers format');
      }

      // Validate encrypted key is base64
      try {
        Buffer.from(encryptedSubmission.encryptedSubmissionKey, 'base64');
      } catch {
        throw new Error('Invalid encrypted key format');
      }

      console.log('✅ Submission package structure is valid');
      return true;
    } catch (error) {
      console.error('❌ Submission package validation failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static runAllTests() {
    console.log('=== Running All Submission Tests ===\n');

    try {
      // Test canonicalization
      this.testAnswerCanonicalization();
      console.log('');

      // Test multiple choice ordering
      this.testMultipleChoiceOrdering();
      console.log('');

      // Test full encryption process
      const encryptedSubmission = this.testSubmissionEncryption();
      console.log('');

      // Validate package structure
      this.validateSubmissionPackage(encryptedSubmission);
      console.log('');

      console.log('=== All Tests Completed Successfully ===');
      return true;
    } catch (error) {
      console.error('=== Test Suite Failed ===');
      console.error(error);
      return false;
    }
  }
}
