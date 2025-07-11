import { NextRequest, NextResponse } from 'next/server';
import { AuthServerService } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Get session from server-side cookies
    const session = await AuthServerService.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Return user data (without tokens for security)
    return NextResponse.json({
      user: session.user,
      authenticated: true,
    });
  } catch (error) {
    console.error('Verify API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
