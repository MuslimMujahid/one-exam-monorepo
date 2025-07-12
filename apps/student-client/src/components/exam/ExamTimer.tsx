import React from 'react';

interface ExamTimerProps {
  timeRemaining: number;
  formatTime: (seconds: number) => string;
}

export function ExamTimer({ timeRemaining, formatTime }: ExamTimerProps) {
  return (
    <div className="text-right">
      <div
        className={`text-lg font-mono font-bold ${
          timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {formatTime(timeRemaining)}
      </div>
      <div className="text-xs text-gray-500">Time Remaining</div>
    </div>
  );
}
