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
    expect(asc.subscriptionGroups).toBeDefined();
    expect(asc.subscriptions).toBeDefined();
  });

  it('accepts credentials without issuerId (individual key)', () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      privateKey: '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----',
    });
    expect(asc.apps).toBeDefined();
    expect(asc.subscriptionGroups).toBeDefined();
    expect(asc.subscriptions).toBeDefined();
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

describe('AppStoreConnect pagination', () => {
  let privateKey: string;

  beforeAll(async () => {
    const { privateKey: pk } = await generateKeyPair('ES256', { extractable: true });
    privateKey = await exportPKCS8(pk);
  });

  it('follows links.next across pages and terminates when absent', async () => {
    const pages = [
      {
        url: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p1&limit=2',
        body: {
          data: [{ id: 'a1' }, { id: 'a2' }],
          links: {
            self: 'https://api.appstoreconnect.apple.com/v1/apps',
            next: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p2&limit=2',
          },
        },
      },
      {
        url: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p2&limit=2',
        body: {
          data: [{ id: 'a3' }, { id: 'a4' }],
          links: {
            self: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p2&limit=2',
            next: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p3&limit=2',
          },
        },
      },
      {
        url: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p3&limit=2',
        body: {
          data: [{ id: 'a5' }],
          links: {
            self: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=p3&limit=2',
          },
        },
      },
    ];

    const calls: string[] = [];
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        const url = input instanceof Request ? input.url : String(input);
        calls.push(url);
        const page = pages[call++];
        expect(page).toBeDefined();
        return new Response(JSON.stringify(page!.body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const ids: string[] = [];
    // biome-ignore lint: test uses untyped mock data
    for await (const app of asc.apps.listAll({ limit: 2 } as never)) {
      ids.push((app as unknown as { id: string }).id);
    }

    expect(ids).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect(calls).toHaveLength(3);
    expect(new URL(calls[0]!).searchParams.get('cursor')).toBe(null);
    expect(new URL(calls[0]!).searchParams.get('limit')).toBe('2');
    expect(new URL(calls[1]!).searchParams.get('cursor')).toBe('p2');
    expect(new URL(calls[2]!).searchParams.get('cursor')).toBe('p3');
  });

  it('hits the expected paths for subscription resources', async () => {
    const paths: string[] = [];
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        paths.push(url.pathname);
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await asc.subscriptionGroups.retrieve('grp-1');
    await asc.subscriptionGroups.listForApp('app-9');
    await asc.subscriptionGroups.listSubscriptions('grp-1');
    await asc.subscriptions.retrieve('sub-7');
    await asc.subscriptions.listPrices('sub-7');

    expect(paths).toEqual([
      '/v1/subscriptionGroups/grp-1',
      '/v1/apps/app-9/subscriptionGroups',
      '/v1/subscriptionGroups/grp-1/subscriptions',
      '/v1/subscriptions/sub-7',
      '/v1/subscriptions/sub-7/prices',
    ]);
  });

  it('stops early when the consumer breaks out of the iterator', async () => {
    const calls: string[] = [];
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        const url = input instanceof Request ? input.url : String(input);
        calls.push(url);
        // Always advertise another page — if the iterator kept going we'd
        // loop forever.
        const body = {
          data: [{ id: `x${call++}` }],
          links: {
            self: url,
            next: `https://api.appstoreconnect.apple.com/v1/apps?cursor=p${call}`,
          },
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    let seen = 0;
    for await (const _page of asc.apps.listAllPages()) {
      seen++;
      if (seen >= 2) break;
    }

    expect(seen).toBe(2);
    expect(calls).toHaveLength(2);
  });
});
