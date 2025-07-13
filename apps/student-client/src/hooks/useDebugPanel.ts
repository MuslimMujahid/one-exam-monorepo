import { useState, useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsOptions {
  onManualSave?: () => void;
  onToggleDebug?: () => void;
  isExamActive?: boolean;
}

export function useKeyboardShortcuts({
  onManualSave,
  onToggleDebug,
  isExamActive = false,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's' && isExamActive) {
        event.preventDefault();
        onManualSave?.();
      }

      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        onToggleDebug?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onManualSave, onToggleDebug, isExamActive]);
}

export interface DebugInfo {
  sessionId?: string;
  examStarted: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  answersCount: number;
  timeRemaining: number;
  lastSaveTime: string | null;
  autoSaveEnabled: boolean;
}

export function useDebugPanel() {
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const toggleDebugPanel = useCallback(() => {
    setShowDebugPanel((prev) => !prev);
  }, []);

  const hideDebugPanel = useCallback(() => {
    setShowDebugPanel(false);
  }, []);

  return {
    showDebugPanel,
    toggleDebugPanel,
    hideDebugPanel,
  };
}
