import { afterEach, describe, expect, it, vi } from 'vitest';

const webAuthnMocks = vi.hoisted(() => ({
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}));

vi.mock('@simplewebauthn/browser', () => webAuthnMocks);

import { authApi } from '../api/auth.api';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  webAuthnMocks.startAuthentication.mockReset();
  webAuthnMocks.startRegistration.mockReset();
});

describe('authApi.loginPasskey', () => {
  it('treats a blank username as account discovery and opens device authentication', async () => {
    const user = {
      id: 'user-1',
      username: 'atleta',
      displayName: 'Atleta',
      createdAt: '2026-08-25T12:00:00.000Z',
      passkeys: [],
      passwordEnabled: false,
    };
    const options = {
      challenge: 'challenge',
      timeout: 300_000,
      rpId: 'localhost',
      userVerification: 'required',
    };
    const credential = {
      id: 'credential-id',
      rawId: 'credential-id',
      response: {
        authenticatorData: 'authenticator-data',
        clientDataJSON: 'client-data',
        signature: 'signature',
        userHandle: 'user-handle',
      },
      type: 'public-key',
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    };
    webAuthnMocks.startAuthentication.mockResolvedValueOnce(credential);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(options))
      .mockResolvedValueOnce(jsonResponse({ verified: true, user }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authApi.loginPasskey('   ')).resolves.toEqual(user);

    const firstRequest = fetchMock.mock.calls[0];
    expect(firstRequest).toBeDefined();
    if (!firstRequest) throw new Error('No se realizó la solicitud inicial.');
    expect(firstRequest[0]).toBe('/api/auth/login/options');
    expect(JSON.parse(String(firstRequest[1]?.body))).toEqual({});
    expect(webAuthnMocks.startAuthentication).toHaveBeenCalledWith({ optionsJSON: options });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/login/verify');
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
