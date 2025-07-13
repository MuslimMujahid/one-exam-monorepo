import React from 'react';
import { DebugInfo } from '../../hooks/useDebugPanel';

interface DebugPanelProps {
  show: boolean;
  debugInfo: DebugInfo;
  formatTime: (seconds: number) => string;
  onManualSave: () => void;
  onClose: () => void;
}

export function DebugPanel({
  show,
  debugInfo,
  formatTime,
  onManualSave,
  onClose,
}: DebugPanelProps) {
  if (!show) return null;

  const {
    sessionId,
    examStarted,
    currentQuestionIndex,
    totalQuestions,
    answersCount,
    timeRemaining,
    lastSaveTime,
    autoSaveEnabled,
  } = debugInfo;

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50 max-w-md">
      <h3 className="text-lg font-semibold mb-2">Debug Panel</h3>
      <div className="space-y-1 text-sm">
        <p>
          <strong>Session ID:</strong> {sessionId}
        </p>
        <p>
          <strong>Exam Started:</strong> {examStarted ? 'Yes' : 'No'}
        </p>
        <p>
          <strong>Current Question:</strong> {currentQuestionIndex + 1} /{' '}
          {totalQuestions}
        </p>
        <p>
          <strong>Answers Count:</strong> {answersCount}
        </p>
        <p>
          <strong>Time Remaining:</strong> {formatTime(timeRemaining)}
        </p>
        <p>
          <strong>Last Save:</strong> {lastSaveTime || 'Never'}
        </p>
        <p>
          <strong>Auto-Save:</strong> {autoSaveEnabled ? 'Enabled' : 'Disabled'}
        </p>
      </div>
      <div className="mt-3 space-x-2">
        <button
          onClick={onManualSave}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        >
          Manual Save
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
        >
          Close
        </button>
      </div>
      <p className="text-xs mt-2 text-gray-300">
        Press Ctrl+D to toggle, Ctrl+S to save
      </p>
    </div>
  );
}
