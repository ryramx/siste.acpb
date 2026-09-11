const SESSION_STORAGE_KEY = 'acpb_session';

export interface Session {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.accessToken || Date.now() >= session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(accessToken: string, expiresInSeconds: number): void {
  const session: Session = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
