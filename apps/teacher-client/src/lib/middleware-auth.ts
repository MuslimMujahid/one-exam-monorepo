import { NextRequest, NextResponse } from 'next/server';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface AuthResult {
  success: boolean;
  response: NextResponse;
  user?: User;
}

export async function handleAuthentication(
  request: NextRequest
): Promise<AuthResult> {
  console.log('Checking authentication for:', request.nextUrl.pathname);

  // Get tokens from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  console.log('Tokens found:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  // If no tokens, redirect to login
  if (!accessToken || !refreshToken) {
    console.log('No tokens found, redirecting to login');
    return {
      success: false,
      response: NextResponse.redirect(new URL('/login', request.url)),
    };
  }

  // Verify the access token by making a request to the backend
  try {
    console.log('Verifying access token with backend');
    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If token is valid, continue
    if (verifyResponse.ok) {
      console.log('Access token valid, allowing request');
      const userData = await verifyResponse.json();
      return {
        success: true,
        response: NextResponse.next(),
        user: userData.user,
      };
    }

    // Token is invalid, try to refresh
    console.log('Access token invalid, attempting refresh');
    const refreshResult = await refreshTokens(request, refreshToken);
    return refreshResult;
  } catch (error) {
    console.error('Middleware auth error:', error);
    return {
      success: false,
      response: createAuthErrorResponse(request),
    };
  }
}

async function refreshTokens(
  request: NextRequest,
  refreshToken: string
): Promise<AuthResult> {
  try {
    const refreshResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      }
    );

    if (!refreshResponse.ok) {
      console.log('Refresh token invalid, redirecting to login');
      return {
        success: false,
        response: createAuthErrorResponse(request),
      };
    }

    console.log('Tokens refreshed successfully');
    const newTokens = await refreshResponse.json();
    const response = NextResponse.next();

    // Update cookies with new tokens
    response.cookies.set('accessToken', newTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      response: createAuthErrorResponse(request),
    };
  }
}

function createAuthErrorResponse(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/login', request.url));

  // Clear invalid cookies
  response.cookies.delete('accessToken');
  response.cookies.delete('refreshToken');
  response.cookies.delete('userData');

  return response;
}

export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/login', '/register', '/api/auth', '/unauthorized'];
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export function isRootRoute(pathname: string): boolean {
  return pathname === '/';
}
