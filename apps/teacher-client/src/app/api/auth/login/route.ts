import { NextRequest, NextResponse } from 'next/server';
import { AuthServerService } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Use the AuthServerService to login and set session
    const sessionData = await AuthServerService.loginDirect(email, password);

    return NextResponse.json({
      user: sessionData.user,
      success: true,
    });
  } catch (error) {
    console.error('Login API error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
