import React, { useState } from 'react';
import { Button } from '@one-exam-monorepo/ui';

interface MockAuthDemoProps {
  onLogin: (email: string, password: string) => void;
}

export function MockAuthDemo({ onLogin }: MockAuthDemoProps) {
  const [showDemo, setShowDemo] = useState(false);

  const handleMockLogin = () => {
    // Simulate a successful login with mock credentials
    onLogin('student@example.com', 'password123');
  };

  if (!showDemo) {
    return (
      <div className="mt-6 text-center">
        <Button
          onClick={() => setShowDemo(true)}
          variant="outline"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Demo Mode (No Backend Required)
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Mode</h3>
      <p className="text-xs text-blue-700 mb-3">
        This demo simulates authentication without requiring a backend API.
      </p>
      <div className="space-y-2">
        <Button
          onClick={handleMockLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          Login as Demo Student
        </Button>
        <p className="text-xs text-blue-600">Email: student@example.com</p>
      </div>
    </div>
  );
}
