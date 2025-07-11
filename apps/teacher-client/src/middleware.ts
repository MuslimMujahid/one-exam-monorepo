import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  handleAuthentication,
  isPublicRoute,
  isRootRoute,
} from './lib/middleware-auth';

export async function middleware(request: NextRequest) {
  console.log('Middleware running for:', request.nextUrl.pathname);

  // Allow access to root page
  if (isRootRoute(request.nextUrl.pathname)) {
    console.log('Allowing access to root page');
    return NextResponse.next();
  }

  // If accessing public route, allow
  if (isPublicRoute(request.nextUrl.pathname)) {
    console.log('Allowing access to public route');
    return NextResponse.next();
  }

  // Handle authentication for protected routes
  const authResult = await handleAuthentication(request);
  return authResult.response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
