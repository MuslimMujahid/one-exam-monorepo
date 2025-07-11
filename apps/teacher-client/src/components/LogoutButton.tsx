'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthClientService } from '../lib/auth-client';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Use AuthClientService for client-side logout
      await AuthClientService.logout();

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      router.push('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>Log out</span>
    </button>
  );
}
