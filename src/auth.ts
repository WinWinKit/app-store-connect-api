import { SignJWT, importPKCS8 } from 'jose';
import type { AppStoreConnectCredentials } from './client.js';

/**
 * Default token lifetime in seconds (20 minutes).
 *
 * Apple rejects tokens with an `exp` more than 20 minutes in the future, so
 * this is the maximum practical TTL. Consumers may pass a smaller value via
 * {@link AppStoreConnectCredentials.tokenTtlSeconds} to reduce the blast
 * radius if a token is leaked.
 */
const DEFAULT_TTL_SECONDS = 20 * 60;

/**
 * How many seconds before expiry a cached token is considered stale.
 *
 * A 60-second margin avoids edge cases where a request is sent with a token
 * that is about to expire but gets rejected by the time it hits Apple's
 * servers (due to clock skew, network latency, or slow TLS handshakes).
 */
const REFRESH_MARGIN_SECONDS = 60;

/**
 * Mints and caches short-lived ES256 JWTs for App Store Connect API requests.
 *
 * The App Store Connect API uses stateless JWT bearer tokens instead of
 * long-lived API keys. Each token is signed with an ES256 private key
 * (`.p8` file) downloaded from App Store Connect → Users and Access → Keys.
 *
 * Two key flavors are supported, distinguished by whether
 * {@link AppStoreConnectCredentials.issuerId} is provided:
 *
 * - **Team keys** — `issuerId` is set, so the JWT payload carries the
 *   standard `iss` claim identifying the App Store Connect team.
 * - **Individual keys** — `issuerId` is omitted, so the JWT payload carries
 *   `sub: "user"` instead. Individual keys are scoped to the person who
 *   created them and therefore have no team-level issuer.
 *
 * This provider caches the most recently minted token in memory and reuses it
 * until it enters the {@link REFRESH_MARGIN_SECONDS} window before expiry.
 * One `TokenProvider` instance is created per {@link AppStoreConnect} client.
 *
 * This class is not safe to share across mutually untrusted credentials —
 * each set of credentials gets its own provider.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
 */
export class TokenProvider {
  /** Most recently minted JWT, or `null` if none has been minted yet. */
  private cachedToken: string | null = null;
  /** Unix timestamp (seconds) at which {@link cachedToken} expires. */
  private expiresAt = 0;

  /**
   * @param credentials - Key ID, issuer ID, and PEM-encoded ES256 private key
   *   obtained from App Store Connect.
   */
  constructor(private readonly credentials: AppStoreConnectCredentials) {}

  /**
   * Return a valid JWT, minting a new one if the cache is empty or stale.
   *
   * Called by {@link AppStoreConnect.request} before every outbound request.
   * The issued JWT carries either an `iss` claim (team keys) or a
   * `sub: "user"` claim (individual keys) — see the class-level docs for the
   * selection rule.
   *
   * @returns A signed JWT suitable for use in an `Authorization: Bearer` header.
   * @throws If the private key cannot be parsed as a PKCS#8 ES256 key, or
   *   if JWT signing fails.
   */
  async getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && now < this.expiresAt - REFRESH_MARGIN_SECONDS) {
      return this.cachedToken;
    }

    const key = await importPKCS8(this.credentials.privateKey, 'ES256');
    const ttl = this.credentials.tokenTtlSeconds ?? DEFAULT_TTL_SECONDS;
    const exp = now + ttl;

    // Team keys carry an `iss` (team UUID) claim; individual keys carry a
    // `sub: "user"` claim instead. The two modes are mutually exclusive and
    // selected by presence of `issuerId` on the credentials.
    const builder = new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.credentials.keyId, typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setAudience('appstoreconnect-v1');

    if (this.credentials.issuerId !== undefined) {
      builder.setIssuer(this.credentials.issuerId);
    } else {
      builder.setSubject('user');
    }

    const token = await builder.sign(key);

    this.cachedToken = token;
    this.expiresAt = exp;
    return token;
  }
}
