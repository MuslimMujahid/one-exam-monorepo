import { AuthServerService } from '../lib/auth-server';

export async function fetchProtectedData() {
  const session = await AuthServerService.getSession();

  if (!session?.tokens.accessToken) {
    // Handle unauthenticated state
    return null;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/protected`,
    {
      headers: {
        Authorization: `Bearer ${session.tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch protected data');
  }

  return response.json();
}
