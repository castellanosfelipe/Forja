import { randomBytes, randomUUID } from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { AppConfig } from '../config/env.js';
import type {
  AuthenticationFlowClaims,
  RegistrationFlowClaims,
  StoredPasskey,
  User,
} from '../domain/models.js';
import { badRequest, conflict, forbidden, unauthorized } from '../http/errors.js';
import type { AccountRepository } from '../repositories/contracts.js';
import { objectBody, stringField, username as normalizeUsername } from '../utils/validation.js';

export class WebAuthnService {
  public constructor(
    private readonly config: AppConfig,
    private readonly database: AccountRepository,
  ) {}

  public async beginRegistration(
    input: unknown,
    authenticatedUser: User | null,
  ): Promise<{ options: Awaited<ReturnType<typeof generateRegistrationOptions>>; flow: RegistrationFlowClaims }> {
    const body = objectBody(input);
    let userId: string;
    let webauthnUserId: string;
    let username: string;
    let displayName: string;
    let existingUserId: string | null;
    let passkeys: StoredPasskey[];

    if (authenticatedUser) {
      userId = authenticatedUser.id;
      webauthnUserId = authenticatedUser.webauthnUserId;
      username = authenticatedUser.username;
      displayName = authenticatedUser.displayName;
      existingUserId = authenticatedUser.id;
      passkeys = authenticatedUser.passkeys;
    } else {
      username = normalizeUsername(stringField(body, 'username', { min: 3, max: 64 })!);
      displayName = stringField(body, 'displayName', { min: 1, max: 100 })!;
      if (await this.database.findUserByUsername(username)) {
        throw conflict('Username is already registered');
      }
      userId = randomUUID();
      webauthnUserId = randomBytes(32).toString('base64url');
      existingUserId = null;
      passkeys = [];
    }

    const options = await generateRegistrationOptions({
      rpName: this.config.rpName,
      rpID: this.config.rpId,
      userID: Buffer.from(webauthnUserId, 'base64url'),
      userName: username,
      userDisplayName: displayName,
      timeout: this.config.authFlowTtlSeconds * 1_000,
      attestationType: 'none',
      excludeCredentials: passkeys.map((passkey) => ({
        id: passkey.id,
        transports: passkey.transports,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    const now = Math.floor(Date.now() / 1000);
    return {
      options,
      flow: {
        kind: 'registration',
        challenge: options.challenge,
        userId,
        webauthnUserId,
        username,
        displayName,
        existingUserId,
        iat: now,
        exp: now + this.config.authFlowTtlSeconds,
      },
    };
  }

  public async finishRegistration(
    input: unknown,
    flow: RegistrationFlowClaims,
    authenticatedUser: User | null,
  ): Promise<User> {
    if (flow.existingUserId && authenticatedUser?.id !== flow.existingUserId) {
      throw forbidden('An active session for this account is required to add a Passkey');
    }
    if (!flow.existingUserId && authenticatedUser) {
      throw conflict('Sign out before registering a different account');
    }
    const response = this.registrationResponse(input);
    const verification = await this.verifyRegistration(response, flow.challenge);
    if (!verification.verified) {
      throw unauthorized('Passkey registration could not be verified');
    }
    const now = new Date().toISOString();
    const credential = verification.registrationInfo.credential;
    const passkey: StoredPasskey = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: verification.registrationInfo.credentialDeviceType,
      backedUp: verification.registrationInfo.credentialBackedUp,
      createdAt: now,
      lastUsedAt: null,
    };

    if (flow.existingUserId) {
      return this.database.addPasskey(flow.existingUserId, passkey);
    }
    const user: User = {
      id: flow.userId,
      webauthnUserId: flow.webauthnUserId,
      username: flow.username,
      displayName: flow.displayName,
      stateFileKey: flow.userId,
      createdAt: now,
      updatedAt: now,
      passkeys: [passkey],
      passwordCredential: null,
    };
    return this.database.createUser(user);
  }

  public async beginAuthentication(
    input: unknown,
  ): Promise<{ options: Awaited<ReturnType<typeof generateAuthenticationOptions>>; flow: AuthenticationFlowClaims }> {
    const body = objectBody(input);
    const suppliedUsername = stringField(body, 'username', { optional: true, max: 64 });
    const user = suppliedUsername
      ? await this.database.findUserByUsername(normalizeUsername(suppliedUsername))
      : null;
    if (suppliedUsername && !user) {
      throw unauthorized('No account is registered for that username');
    }
    const options = await generateAuthenticationOptions({
      rpID: this.config.rpId,
      timeout: this.config.authFlowTtlSeconds * 1_000,
      userVerification: 'required',
      ...(user
        ? {
            allowCredentials: user.passkeys.map((passkey) => ({
              id: passkey.id,
              transports: passkey.transports,
            })),
          }
        : {}),
    });
    const now = Math.floor(Date.now() / 1000);
    return {
      options,
      flow: {
        kind: 'authentication',
        challenge: options.challenge,
        allowedUserId: user?.id ?? null,
        iat: now,
        exp: now + this.config.authFlowTtlSeconds,
      },
    };
  }

  public async finishAuthentication(input: unknown, flow: AuthenticationFlowClaims): Promise<User> {
    const response = this.authenticationResponse(input);
    const user = await this.database.findUserByCredentialId(response.id);
    if (!user || (flow.allowedUserId && flow.allowedUserId !== user.id)) {
      throw unauthorized('Passkey is not registered for this account');
    }
    const passkey = user.passkeys.find((candidate) => candidate.id === response.id);
    if (!passkey) throw unauthorized('Passkey is not registered');

    const verification = await this.verifyAuthentication(response, flow.challenge, passkey);
    if (!verification.verified) {
      throw unauthorized('Passkey authentication could not be verified');
    }
    return this.database.updatePasskey(user.id, passkey.id, {
      counter: verification.authenticationInfo.newCounter,
      deviceType: verification.authenticationInfo.credentialDeviceType,
      backedUp: verification.authenticationInfo.credentialBackedUp,
      lastUsedAt: new Date().toISOString(),
    });
  }

  private registrationResponse(input: unknown): RegistrationResponseJSON {
    const response = objectBody(input);
    if (response.type !== 'public-key' || typeof response.id !== 'string' || !response.response) {
      throw badRequest('Invalid WebAuthn registration response');
    }
    return response as unknown as RegistrationResponseJSON;
  }

  private async verifyRegistration(response: RegistrationResponseJSON, challenge: string) {
    try {
      return await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.config.expectedOrigins,
        expectedRPID: this.config.rpId,
        requireUserPresence: true,
        requireUserVerification: true,
        supportedAlgorithmIDs: [-7, -257],
      });
    } catch {
      throw unauthorized('Passkey registration response is invalid');
    }
  }

  private async verifyAuthentication(
    response: AuthenticationResponseJSON,
    challenge: string,
    passkey: StoredPasskey,
  ) {
    try {
      return await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.config.expectedOrigins,
        expectedRPID: this.config.rpId,
        credential: {
          id: passkey.id,
          publicKey: Buffer.from(passkey.publicKey, 'base64url'),
          counter: passkey.counter,
          transports: passkey.transports,
        },
        requireUserVerification: true,
      });
    } catch {
      throw unauthorized('Passkey authentication response is invalid');
    }
  }

  private authenticationResponse(input: unknown): AuthenticationResponseJSON {
    const response = objectBody(input);
    if (response.type !== 'public-key' || typeof response.id !== 'string' || !response.response) {
      throw badRequest('Invalid WebAuthn authentication response');
    }
    return response as unknown as AuthenticationResponseJSON;
  }
}
