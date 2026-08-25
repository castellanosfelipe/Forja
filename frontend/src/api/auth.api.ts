import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import type { AuthUser, PasskeySummary, SessionResponse } from '../types/auth';
import { api } from './client';

export const authApi = {
  session: () => api<SessionResponse>('/api/auth/session'),

  async registerPasskey(username: string, displayName: string): Promise<AuthUser> {
    const options = await api<PublicKeyCredentialCreationOptionsJSON>('/api/auth/register/options', {
      method: 'POST',
      json: { username, displayName },
    });
    const credential = await startRegistration({ optionsJSON: options });
    const result = await api<{ verified: true; user: AuthUser }>('/api/auth/register/verify', {
      method: 'POST',
      json: credential,
    });
    return result.user;
  },

  async addPasskey(): Promise<AuthUser> {
    const options = await api<PublicKeyCredentialCreationOptionsJSON>('/api/auth/register/options', {
      method: 'POST',
      json: {},
    });
    const credential = await startRegistration({ optionsJSON: options });
    const result = await api<{ verified: true; user: AuthUser }>('/api/auth/register/verify', {
      method: 'POST',
      json: credential,
    });
    return result.user;
  },

  async loginPasskey(username?: string): Promise<AuthUser> {
    const normalizedUsername = username?.trim();
    const options = await api<PublicKeyCredentialRequestOptionsJSON>('/api/auth/login/options', {
      method: 'POST',
      json: normalizedUsername ? { username: normalizedUsername } : {},
    });
    const credential = await startAuthentication({ optionsJSON: options });
    const result = await api<{ verified: true; user: AuthUser }>('/api/auth/login/verify', {
      method: 'POST',
      json: credential,
    });
    return result.user;
  },

  async registerWithPassword(username: string, password: string): Promise<AuthUser> {
    const result = await api<{ user: AuthUser }>('/api/auth/password/register', {
      method: 'POST',
      json: { username, password },
    });
    return result.user;
  },

  async loginWithPassword(username: string, password: string): Promise<AuthUser> {
    const result = await api<{ user: AuthUser }>('/api/auth/password/login', {
      method: 'POST',
      json: { username, password },
    });
    return result.user;
  },

  logout: () => api<void>('/api/auth/logout', { method: 'POST', json: {} }),
  listPasskeys: () => api<{ passkeys: PasskeySummary[] }>('/api/auth/passkeys'),
  removePasskey: (id: string) => api<void>(`/api/auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
