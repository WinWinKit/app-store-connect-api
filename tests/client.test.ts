import { exportPKCS8, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
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

describe('AppStoreConnect.request query serialization', () => {
  let privateKey: string;

  beforeAll(async () => {
    const { privateKey: pk } = await generateKeyPair('ES256', { extractable: true });
    privateKey = await exportPKCS8(pk);
  });

  it('serializes array query params as comma-separated, omits undefined/null/empty', async () => {
    const calls: URL[] = [];
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        calls.push(new URL(input instanceof Request ? input.url : String(input)));
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await asc.apps.list({
      'filter[bundleId]': ['com.acme.one', 'com.acme.two'],
      'fields[apps]': ['name', 'bundleId'],
      limit: 10,
      sort: [],
      include: undefined,
    });

    const url = calls[0];
    expect(url).toBeDefined();
    expect(url!.pathname).toBe('/v1/apps');
    expect(url!.searchParams.get('filter[bundleId]')).toBe('com.acme.one,com.acme.two');
    expect(url!.searchParams.get('fields[apps]')).toBe('name,bundleId');
    expect(url!.searchParams.get('limit')).toBe('10');
    expect(url!.searchParams.has('sort')).toBe(false);
    expect(url!.searchParams.has('include')).toBe(false);
  });

  it('url-encodes the resource id in retrieve()', async () => {
    const calls: URL[] = [];
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        calls.push(new URL(input instanceof Request ? input.url : String(input)));
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await asc.apps.retrieve('abc/def 1');
    expect(calls[0]!.pathname).toBe('/v1/apps/abc%2Fdef%201');
  });
});
