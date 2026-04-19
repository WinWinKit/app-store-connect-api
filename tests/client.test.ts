import { describe, expect, it } from 'vitest';
import { AppStoreConnect } from '../src/index.js';

describe('AppStoreConnect', () => {
  it('exposes resource namespaces (team key)', () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey: '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----',
    });
    expect(asc.apps).toBeDefined();
  });

  it('accepts credentials without issuerId (individual key)', () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      privateKey: '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----',
    });
    expect(asc.apps).toBeDefined();
  });
});
