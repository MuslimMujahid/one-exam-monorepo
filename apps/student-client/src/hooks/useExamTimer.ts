import { useState, useEffect, useCallback } from 'react';

interface UseExamTimerOptions {
  initialTime: number; // in seconds
  onTimeExpired: () => void;
  isActive: boolean;
}

export function useExamTimer({
  initialTime,
  onTimeExpired,
  isActive,
}: UseExamTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Set initial time
  const setInitialTime = useCallback((time: number) => {
    setTimeRemaining(time);
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining > 0 && isActive) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && isActive) {
      onTimeExpired();
    }
  }, [timeRemaining, isActive, onTimeExpired]);

  return {
    timeRemaining,
    setTimeRemaining,
    setInitialTime,
    resetTimer,
    formatTime,
    isExpired: timeRemaining === 0,
  };
}
