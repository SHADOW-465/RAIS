
import { NextRequest, NextResponse } from 'next/server';
import { SessionStore } from '@/lib/db/sessionStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const sessionId = request.headers.get('x-rais-session-id');

    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    try {
        SessionStore.reset(sessionId);
        return NextResponse.json({
            success: true,
            data: { message: 'Session cleared' }
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to reset session' }, { status: 500 });
    }
}
