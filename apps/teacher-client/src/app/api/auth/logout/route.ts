import { NextRequest, NextResponse } from 'next/server';
import { AuthServerService } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Clear session using AuthServerService
    await AuthServerService.clearSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
