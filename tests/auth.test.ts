import {
  createLocalJWKSet,
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
  type JWK,
  type KeyLike,
} from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenProvider } from '../src/auth.js';

/**
 * Fresh key pair generated once for the whole file — each test gets its
 * own {@link TokenProvider} but they all share the same signing key.
 */
let privateKeyPem: string;
let publicKey: KeyLike;

beforeAll(async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  privateKeyPem = await exportPKCS8(pair.privateKey);
  publicKey = pair.publicKey;
});

/**
 * Decode and cryptographically verify a JWT against the fixture public key.
 * Throws if the signature is invalid or the token is malformed — tests can
 * rely on the verified payload/header without re-checking those invariants.
 */
async function verify(token: string, keyId: string): Promise<{
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}> {
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: keyId };
  const jwks = createLocalJWKSet({ keys: [jwk] });
  const { protectedHeader, payload } = await jwtVerify(token, jwks, {
    audience: 'appstoreconnect-v1',
  });
  return {
    header: protectedHeader as Record<string, unknown>,
    payload: payload as Record<string, unknown>,
  };
}

describe('TokenProvider (team key)', () => {
  it('mints a valid ES256 JWT with the expected header and team claims', async () => {
    const provider = new TokenProvider({
      keyId: 'KEY123',
      issuerId: 'ISSUER-UUID',
      privateKey: privateKeyPem,
    });

    const before = Math.floor(Date.now() / 1000);
    const token = await provider.getToken();
    const after = Math.floor(Date.now() / 1000);

    const { header, payload } = await verify(token, 'KEY123');

    expect(header['alg']).toBe('ES256');
    expect(header['typ']).toBe('JWT');
    expect(header['kid']).toBe('KEY123');

    expect(payload['iss']).toBe('ISSUER-UUID');
    expect(payload['aud']).toBe('appstoreconnect-v1');
    expect(payload).not.toHaveProperty('sub');

    const iat = payload['iat'] as number;
    const exp = payload['exp'] as number;
    expect(iat).toBeGreaterThanOrEqual(before);
    expect(iat).toBeLessThanOrEqual(after);
    // Default TTL is 20 minutes.
    expect(exp - iat).toBe(20 * 60);
  });

  it('respects a custom tokenTtlSeconds', async () => {
    const provider = new TokenProvider({
      keyId: 'KEY123',
      issuerId: 'ISSUER-UUID',
      privateKey: privateKeyPem,
      tokenTtlSeconds: 120,
    });

    const token = await provider.getToken();
    const { payload } = await verify(token, 'KEY123');
    expect((payload['exp'] as number) - (payload['iat'] as number)).toBe(120);
  });
});

describe('TokenProvider (individual key)', () => {
  it('mints a JWT with sub="user" and no iss when issuerId is omitted', async () => {
    const provider = new TokenProvider({
      keyId: 'INDIVIDUAL-KEY',
      privateKey: privateKeyPem,
    });

    const token = await provider.getToken();
    const { header, payload } = await verify(token, 'INDIVIDUAL-KEY');

    expect(header['kid']).toBe('INDIVIDUAL-KEY');
    expect(payload['sub']).toBe('user');
    expect(payload).not.toHaveProperty('iss');
    expect(payload['aud']).toBe('appstoreconnect-v1');
  });
});

describe('TokenProvider caching', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the same token on repeated calls within the refresh window', async () => {
    vi.setSystemTime(new Date('2026-04-19T00:00:00Z'));
    const provider = new TokenProvider({
      keyId: 'K',
      issuerId: 'I',
      privateKey: privateKeyPem,
    });

    const first = await provider.getToken();
    // Advance well inside the refresh window (20 min TTL, 60s margin → 19 min safe).
    vi.setSystemTime(new Date('2026-04-19T00:18:00Z'));
    const second = await provider.getToken();

    expect(second).toBe(first);
  });

  it('mints a new token once the refresh margin is crossed', async () => {
    vi.setSystemTime(new Date('2026-04-19T00:00:00Z'));
    const provider = new TokenProvider({
      keyId: 'K',
      issuerId: 'I',
      privateKey: privateKeyPem,
    });

    const first = await provider.getToken();
    // Move past (exp - 60s) = 20:00 − 60s = 19:00.
    vi.setSystemTime(new Date('2026-04-19T00:19:30Z'));
    const second = await provider.getToken();

    expect(second).not.toBe(first);
  });
});

describe('TokenProvider errors', () => {
  it('throws when the private key is not a valid PEM', async () => {
    const provider = new TokenProvider({
      keyId: 'K',
      issuerId: 'I',
      privateKey: 'not a pem key',
    });

    await expect(provider.getToken()).rejects.toBeInstanceOf(Error);
  });
});
