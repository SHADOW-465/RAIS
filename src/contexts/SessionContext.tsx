'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface SessionContextType {
    sessionId: string | null;
    resetSession: () => void;
    saveSession: () => Promise<void>;
    isSaving: boolean;
}

const SessionContext = createContext<SessionContextType>({
    sessionId: null,
    resetSession: () => { },
    saveSession: async () => { },
    isSaving: false,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Initialize session from storage or create new
        const stored = sessionStorage.getItem('rais_session_id');
        if (stored) {
            setSessionId(stored);
        } else {
            const newId = uuidv4();
            sessionStorage.setItem('rais_session_id', newId);
            setSessionId(newId);
        }
    }, []);

    const resetSession = async () => {
        // Call API to clear backend session data
        if (sessionId) {
            try {
                await fetch('/api/session/reset', {
                    method: 'POST',
                    headers: { 'x-rais-session-id': sessionId }
                });
            } catch (e) {
                console.error('Failed to clear backend session', e);
            }
        }

        // Generate new ID
        const newId = uuidv4();
        sessionStorage.setItem('rais_session_id', newId);
        setSessionId(newId);

        // Force reload to refresh all data
        window.location.reload();
    };

    const saveSession = async () => {
        if (!sessionId) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/session/save', {
                method: 'POST',
                headers: { 'x-rais-session-id': sessionId }
            });
            if (!res.ok) throw new Error('Save failed');

            // After save, maybe we should reset? Or just notify?
            // User said "reset statistics once session is over". 
            // Saving makes it permanent. The session technically continues or clears.
            // Usually "Save" implies "Commit and Clear Staging".
            // Let's reset after save.
            await resetSession();
            alert('Statistics saved to permanent database successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save statistics.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SessionContext.Provider value={{ sessionId, resetSession, saveSession, isSaving }}>
            {children}
        </SessionContext.Provider>
    );
};
