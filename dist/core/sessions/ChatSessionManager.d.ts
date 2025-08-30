import { ChatSession, SessionSettings } from './ChatSession';
import { GlobalConfig } from '../../state/GlobalConfig';
export declare class ChatSessionManager {
    private config;
    private sessions;
    private activeSessionId;
    constructor(config: GlobalConfig);
    createSession(settings?: Partial<SessionSettings>): Promise<string>;
    getSession(sessionId: string): ChatSession | undefined;
    getActiveSession(): ChatSession | undefined;
    setActiveSession(sessionId: string): boolean;
    getAllSessions(): ChatSession[];
    deleteSession(sessionId: string): Promise<boolean>;
    clearSession(sessionId: string): Promise<boolean>;
    updateSessionSettings(sessionId: string, settings: Partial<SessionSettings>): Promise<boolean>;
    private loadSessions;
    private saveSessions;
    getSessionsSortedByActivity(): ChatSession[];
    getSessionCount(): number;
}
