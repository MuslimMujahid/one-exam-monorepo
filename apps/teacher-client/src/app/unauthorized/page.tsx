import { Button } from '@one-exam-monorepo/ui';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Unauthorized</h1>
          <p className="text-lg text-gray-600 mb-8">
            You don&apos;t have permission to access this resource.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Please ensure you have the correct role or contact your
            administrator.
          </p>
          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
