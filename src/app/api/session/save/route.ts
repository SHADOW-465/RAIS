
import { NextRequest, NextResponse } from 'next/server';
import { SessionStore } from '@/lib/db/sessionStore';
import { LocalStore } from '@/lib/db/localStore';
import { DataAggregator } from '@/lib/db/aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const sessionId = request.headers.get('x-rais-session-id');

    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    try {
        if (!SessionStore.exists(sessionId)) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        const sessionDB = SessionStore.read(sessionId);
        let localDB = LocalStore.read();

        // Merge Session -> Local
        localDB = DataAggregator.merge(localDB, sessionDB);
        LocalStore.write(localDB);

        // Optional: Clear session details from the session object if needed, 
        // but SessionContext will likely call reset() or generate new ID anyway.
        // We leave the file for now until explicit reset.

        return NextResponse.json({
            success: true,
            data: { message: 'Session statistics merged to permanent database' }
        });

    } catch (e) {
        console.error('Session save error:', e);
        return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
    }
}
