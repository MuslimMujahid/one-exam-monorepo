# Exam Retake Prevention Fix

## Problem
Users were able to re-take exams after final submission by accessing the exam page again. This happened because the frontend was only checking for active (non-submitted) exam sessions and would create new sessions if none were found, without checking if the exam had already been completed.

## Solution
Modified the exam session management logic to prevent users from starting new exam sessions after they have already completed and submitted an exam.

## Changes Made

### 1. Enhanced `useExamSession` Hook
**File:** `apps/student-client/src/hooks/useExamSession.ts`

- Added `sessionError` state to track session-related errors
- Enhanced `initializeSession()` to check for previously submitted sessions before allowing new session creation
- If a submitted session exists for the exam, the hook now:
  - Sets an appropriate error message
  - Prevents creation of new sessions
  - Returns `null` to block exam access

**Key Logic:**
```typescript
// Check if there's any submitted session for this exam
const submittedSession = existingSessions.find(
  (session) => session.examId === examId && session.examSubmitted
);

if (submittedSession) {
  const errorMsg = 'You have already completed this exam. You cannot retake it.';
  setSessionError(errorMsg);
  throw new Error(errorMsg);
}
```

### 2. Updated `useExamPage` Hook
**File:** `apps/student-client/src/hooks/useExamPage.ts`

- Modified error handling to combine exam data errors with session errors
- Updated the return object to expose session errors through the main `error` property

**Key Change:**
```typescript
error: error || session.sessionError, // Include session errors with exam data errors
```

### 3. Enhanced Dashboard Integration
**Files:**
- `apps/student-client/src/hooks/useExamSessions.ts`
- `apps/student-client/src/pages/DashboardPage.tsx`
- `apps/student-client/src/components/dashboard/ExamGrid.tsx`
- `apps/student-client/src/components/dashboard/ExamCard.tsx`

**Changes:**
- Enhanced `useExamSessions` hook to track submitted sessions and expose helper functions
- Updated dashboard to properly display submission status on exam cards
- Modified exam cards to show "Completed" badge and disable access for submitted exams
- Added visual feedback preventing users from accessing completed exams

**Key Features:**
```tsx
// New session tracking functions
getSubmittedSessionForExam(examId: string): SessionSaveData | null
isExamSubmitted(examId: string): boolean

// Updated exam card display
{isSubmitted && (
  <span className="bg-green-100 text-green-800">
    ✅ Completed
  </span>
)}

// Disabled button for submitted exams
<Button disabled className="bg-green-100 text-green-700">
  ✅ Exam Completed
</Button>
```
### 4. UI Integration
**File:** `apps/student-client/src/pages/ExamPage.tsx`

No changes needed! The existing error handling in `ExamPage.tsx` automatically displays session errors because they are now included in the main `error` property from the `useExamPage` hook.

## Testing
Added comprehensive unit tests in:
- `apps/student-client/src/hooks/useExamSession.test.ts` - Session management tests
- `apps/student-client/src/components/dashboard/ExamCard.test.tsx` - Dashboard UI tests

These tests verify:

1. **Exam retake prevention:** Users cannot access exams they have already submitted
2. **New exam access:** Users can still start new exams normally
3. **Session resumption:** Users can still resume active (non-submitted) exam sessions
4. **Dashboard display:** Exam cards correctly show completion status and disable access
5. **Visual feedback:** Proper badges and button states for different exam states

## Technical Details

### Session State Structure
The `ExamSession` interface already had an `examSubmitted` boolean field that tracks submission status. The fix leverages this existing field to determine if an exam has been completed.

### Error Flow
1. User tries to access an exam they've already submitted
2. `useExamSession.initializeSession()` finds the submitted session
3. Session error is set and thrown
4. `useExamPage` exposes the error through its main error property
5. `ExamPage` displays the error using the existing `AlertBanner` component
6. User sees: "You have already completed this exam. You cannot retake it."

## Backward Compatibility
This change is fully backward compatible:
- Existing active sessions continue to work normally
- New exam sessions are created as before when no submission exists
- Error handling gracefully degrades if session data is corrupted

## Security Considerations
This fix prevents retakes at the frontend/client level. For additional security in production:
- Backend should also validate submission status before allowing exam access
- Consider implementing server-side session validation
- Audit logs should track any attempts to retake completed exams
