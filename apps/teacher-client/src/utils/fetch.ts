import { auth0 } from '../lib/auth0';

export async function fetchProtectedData() {
  const session = await auth0.getSession();

  if (!session?.accessToken) {
    // Handle unauthenticated state
    return null;
  }

  const response = await fetch('http://localhost:3000/api/protected', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  return response.json();
}
