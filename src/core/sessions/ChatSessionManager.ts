import { ChatSession, SessionSettings } from './ChatSession';
import { GlobalConfig } from '../../state/GlobalConfig';

export class ChatSessionManager {
    private sessions = new Map<string, ChatSession>();
    private activeSessionId: string | null = null;

    constructor(private config: GlobalConfig) {
        this.loadSessions();
    }

    async createSession(settings?: Partial<SessionSettings>): Promise<string> {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const defaultSettings: SessionSettings = {
            providerId: this.config.getDefaultProvider(),
            modelId: '', // Will be set when provider is initialized
            temperature: this.config.getDefaultTemperature()
        };

        const session = new ChatSession(sessionId, {
            ...defaultSettings,
            ...settings
        });

        this.sessions.set(sessionId, session);
        this.activeSessionId = sessionId;
        
        await this.saveSessions();
        
        return sessionId;
    }

    getSession(sessionId: string): ChatSession | undefined {
        return this.sessions.get(sessionId);
    }

    getActiveSession(): ChatSession | undefined {
        if (this.activeSessionId) {
            return this.sessions.get(this.activeSessionId);
        }
        return undefined;
    }

    setActiveSession(sessionId: string): boolean {
        if (this.sessions.has(sessionId)) {
            this.activeSessionId = sessionId;
            this.saveSessions();
            return true;
        }
        return false;
    }

    getAllSessions(): ChatSession[] {
        return Array.from(this.sessions.values());
    }

    async deleteSession(sessionId: string): Promise<boolean> {
        const deleted = this.sessions.delete(sessionId);
        
        if (deleted) {
            if (this.activeSessionId === sessionId) {
                // Set the most recent session as active, or create a new one
                const remainingSessions = Array.from(this.sessions.values());
                if (remainingSessions.length > 0) {
                    const mostRecent = remainingSessions.reduce((latest, session) => {
                        const latestMessages = latest.getMessages();
                        const sessionMessages = session.getMessages();
                        const latestTime = latestMessages[latestMessages.length - 1]?.timestamp || 0;
                        const sessionTime = sessionMessages[sessionMessages.length - 1]?.timestamp || 0;
                        return sessionTime > latestTime ? session : latest;
                    });
                    this.activeSessionId = mostRecent.id;
                } else {
                    this.activeSessionId = null;
                }
            }
            
            await this.saveSessions();
        }
        
        return deleted;
    }

    async clearSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.clear();
            await this.saveSessions();
            return true;
        }
        return false;
    }

    async updateSessionSettings(sessionId: string, settings: Partial<SessionSettings>): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.updateSettings(settings);
            await this.saveSessions();
            return true;
        }
        return false;
    }

    private async loadSessions(): Promise<void> {
        try {
            const sessionsData = this.config.getGlobalState('chatSessions', []);
            const activeSessionId = this.config.getGlobalState('activeSessionId', null);

            for (const data of sessionsData) {
                try {
                    const session = ChatSession.deserialize(data);
                    this.sessions.set(session.id, session);
                } catch (error) {
                    console.warn('Failed to deserialize session:', data, error);
                }
            }

            if (activeSessionId && this.sessions.has(activeSessionId)) {
                this.activeSessionId = activeSessionId;
            } else if (this.sessions.size > 0) {
                // Set the most recent session as active
                const mostRecent = Array.from(this.sessions.values()).reduce((latest, session) => {
                    const latestMessages = latest.getMessages();
                    const sessionMessages = session.getMessages();
                    const latestTime = latestMessages[latestMessages.length - 1]?.timestamp || 0;
                    const sessionTime = sessionMessages[sessionMessages.length - 1]?.timestamp || 0;
                    return sessionTime > latestTime ? session : latest;
                });
                this.activeSessionId = mostRecent.id;
            }

            // Create a default session if none exist
            if (this.sessions.size === 0) {
                await this.createSession();
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
            // Create a default session on error
            await this.createSession();
        }
    }

    private async saveSessions(): Promise<void> {
        try {
            const sessionsData = Array.from(this.sessions.values()).map(session => session.serialize());
            await this.config.setGlobalState('chatSessions', sessionsData);
            await this.config.setGlobalState('activeSessionId', this.activeSessionId);
        } catch (error) {
            console.error('Failed to save sessions:', error);
        }
    }

    // Get sessions sorted by last activity
    getSessionsSortedByActivity(): ChatSession[] {
        return Array.from(this.sessions.values()).sort((a, b) => {
            const aMessages = a.getMessages();
            const bMessages = b.getMessages();
            const aTime = aMessages[aMessages.length - 1]?.timestamp || 0;
            const bTime = bMessages[bMessages.length - 1]?.timestamp || 0;
            return bTime - aTime;
        });
    }

    getSessionCount(): number {
        return this.sessions.size;
    }
}
