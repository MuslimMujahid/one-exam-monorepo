import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@one-exam-monorepo/ui';
import { AuthServerService } from '../../lib/auth-server';
import { UserIcon, ChevronDown } from 'lucide-react';
import { redirect } from 'next/navigation';
import LogoutButton from '../../components/LogoutButton';

export const metadata = {
  title: 'Dashboard',
  description: 'Dashboard for teachers to manage their classes and students',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication and teacher role
  const session = await AuthServerService.requireRole('TEACHER');

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Teacher Dashboard
              </h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {session.user.name || session.user.email}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <div className="px-2 py-1.5 text-sm text-gray-600">
                      <div className="font-medium">
                        {session.user.name || 'Teacher'}
                      </div>
                      <div className="text-xs">{session.user.email}</div>
                      <div className="text-xs text-blue-600 capitalize">
                        {session.user.role}
                      </div>
                    </div>
                  </DropdownMenuGroup>
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <LogoutButton />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
