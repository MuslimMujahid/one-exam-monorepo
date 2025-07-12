import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@one-exam-monorepo/ui';

interface JoinExamModalProps {
  isOpen: boolean;
  examCode: string;
  passKey: string;
  joinError: string;
  joinSuccess: string;
  isPending: boolean;
  onClose: () => void;
  onExamCodeChange: (value: string) => void;
  onPassKeyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function JoinExamModal({
  isOpen,
  examCode,
  passKey,
  joinError,
  joinSuccess,
  isPending,
  onClose,
  onExamCodeChange,
  onPassKeyChange,
  onSubmit,
}: JoinExamModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Exam</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {joinError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{joinError}</div>
            </div>
          )}

          {joinSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{joinSuccess}</div>
            </div>
          )}

          <div>
            <label
              htmlFor="examCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Exam Code
            </label>
            <input
              type="text"
              id="examCode"
              value={examCode}
              onChange={(e) => onExamCodeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter exam code"
              disabled={isPending}
              required
            />
          </div>

          <div>
            <label
              htmlFor="passKey"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Pass Key
            </label>
            <input
              type="password"
              id="passKey"
              value={passKey}
              onChange={(e) => onPassKeyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter pass key"
              disabled={isPending}
              required
            />
          </div>

          <DialogFooter className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? 'Joining...' : 'Join Exam'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
