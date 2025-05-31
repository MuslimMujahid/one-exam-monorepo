import { Button } from "@one-exam-monorepo/ui";
import { auth0 } from "../../lib/auth0";

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
              <Button asChild variant="outline">
                <a href="/auth/logout">Log out</a>
              </Button>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
