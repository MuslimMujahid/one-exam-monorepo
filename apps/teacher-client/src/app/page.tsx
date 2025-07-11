import { AuthServerService } from '../lib/auth-server';
import { redirect } from 'next/navigation';
import { Button } from '@one-exam-monorepo/ui';
import Link from 'next/link';

export default async function HomePage() {
  // Check if user is already authenticated
  const session = await AuthServerService.getSession();

  if (session) {
    // If authenticated, redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">One Exam</h1>
          <p className="text-lg text-gray-600 mb-8">Teacher Portal</p>
          <p className="text-sm text-gray-500 mb-8">
            Please sign in to access your dashboard
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
