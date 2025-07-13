// Example usage from student client to upload offline submissions

interface OfflineSubmissionUpload {
  examId: string;
  examCode: string;
  submissions: StoredSubmission[];
  examStartTime: string;
  examEndTime: string;
  clientInfo?: {
    userAgent?: string;
    platform?: string;
    deviceId?: string;
  };
}

/**
 * Upload stored offline submissions to the backend
 */
export async function uploadOfflineSubmissions(
  examId: string,
  examCode: string,
  examStartTime: string,
  examEndTime: string,
  token: string
): Promise<{
  success: boolean;
  sessionId?: string;
  submissionId?: string;
  score?: number;
  suspiciousLevel?: number;
  detectedAnomalies?: string[];
  message?: string;
  error?: string;
}> {
  try {
    // Get all stored submissions for this exam
    const allSubmissions = await window.electron?.getStoredSubmissions() || [];
    const examSubmissions = allSubmissions.filter(sub => {
      // Filter submissions that belong to this exam
      // This would need to be enhanced based on how submissions are stored
      return sub.location && sub.location.includes(examId);
    });

    if (examSubmissions.length === 0) {
      return {
        success: false,
        error: 'No offline submissions found for this exam'
      };
    }

    // Prepare upload payload
    const uploadData: OfflineSubmissionUpload = {
      examId,
      examCode,
      submissions: examSubmissions,
      examStartTime,
      examEndTime,
      clientInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        deviceId: await generateDeviceId() // You'd implement this
      }
    };

    // Upload to backend
    const response = await fetch('/api/exams/student/submit-offline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(uploadData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to upload submissions'
      };
    }

    const result = await response.json();

    // Clean up local submissions after successful upload
    for (const submission of examSubmissions) {
      try {
        await window.electron?.clearStoredSubmission(
          submission.submissionId,
          submission.sessionId
        );
      } catch (error) {
        console.warn('Failed to clear local submission:', error);
      }
    }

    return {
      success: true,
      sessionId: result.sessionId,
      submissionId: result.submissionId,
      score: result.score,
      suspiciousLevel: result.suspiciousLevel,
      detectedAnomalies: result.detectedAnomalies,
      message: result.message
    };

  } catch (error) {
    console.error('Failed to upload offline submissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check submission analysis results
 */
export async function getSubmissionAnalysis(
  sessionId: string,
  token: string
): Promise<{
  success: boolean;
  analysis?: {
    submissionId: string;
    sessionId: string;
    examTitle: string;
    score: number;
    suspiciousLevel: number;
    detectedAnomalies: string[];
    submissionsCount: number;
    submittedAt: string;
    analyzedAt: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`/api/exams/student/submissions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to get submission analysis'
      };
    }

    const analysis = await response.json();
    return {
      success: true,
      analysis
    };

  } catch (error) {
    console.error('Failed to get submission analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a device ID for client identification
 */
async function generateDeviceId(): Promise<string> {
  // Implementation would depend on available APIs
  // Could use canvas fingerprinting, WebGL, etc.
  const factors = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset()
  ];

  const data = factors.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Example usage in React component
 */
export function useOfflineSubmissionUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const uploadSubmissions = async (
    examId: string,
    examCode: string,
    examStartTime: string,
    examEndTime: string,
    token: string
  ) => {
    setUploading(true);
    try {
      const result = await uploadOfflineSubmissions(
        examId,
        examCode,
        examStartTime,
        examEndTime,
        token
      );
      setUploadResult(result);
      return result;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadResult,
    uploadSubmissions
  };
}
