export interface PasskeySummary {
  id: string;
  transports: string[];
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  passkeys: PasskeySummary[];
  passwordEnabled: boolean;
}

export type SessionResponse =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; user: null };
