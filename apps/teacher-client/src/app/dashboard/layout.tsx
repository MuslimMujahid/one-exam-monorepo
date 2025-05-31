import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@one-exam-monorepo/ui";
import { auth0 } from "../../lib/auth0";
import { UserIcon, LogOut, ChevronDown } from "lucide-react";

export const metadata = {
  title: 'Dashboard',
  description: 'Dashboard for teachers to manage their classes and students',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  if (!session) {
    // Redirect to login if not authenticated
    return (
      <html lang="en">
        <body className="flex h-screen justify-center items-center bg-gray-50">
          <div className="text-center p-8 rounded-lg shadow-md bg-white">
            <p className="mb-4 text-lg font-medium text-gray-700">You must be logged in to access the dashboard.</p>
            <Button asChild>
              <a href="/auth/login">Login</a>
            </Button>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <div className="dashboard-layout">
          <header className="bg-white shadow">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-900">One Exam</h1>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {session.user?.name || 'User'} <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <a href="/dashboard/profile" className="flex w-full items-center">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/auth/logout" className="flex w-full items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
