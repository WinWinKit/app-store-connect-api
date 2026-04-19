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
    expect(asc.salesReports).toBeDefined();
    expect(asc.financeReports).toBeDefined();
    expect(asc.subscriptionOfferCodes).toBeDefined();
    expect(asc.subscriptionOfferCodeCustomCodes).toBeDefined();
    expect(asc.subscriptionOfferCodeOneTimeUseCodes).toBeDefined();
    expect(asc.builds).toBeDefined();
    expect(asc.inAppPurchases).toBeDefined();
    expect(asc.customerReviews).toBeDefined();
    expect(asc.users).toBeDefined();
    expect(asc.betaGroups).toBeDefined();
    expect(asc.subscriptionPricePoints).toBeDefined();
    expect(asc.inAppPurchasePricePoints).toBeDefined();
    expect(asc.appPricePoints).toBeDefined();
    expect(asc.subscriptionPrices).toBeDefined();
    expect(asc.inAppPurchasePriceSchedules).toBeDefined();
    expect(asc.appPriceSchedules).toBeDefined();
  });

  it('accepts credentials without issuerId (individual key)', () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      privateKey: '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----',
    });
    expect(asc.apps).toBeDefined();
    expect(asc.subscriptionGroups).toBeDefined();
    expect(asc.subscriptions).toBeDefined();
    expect(asc.salesReports).toBeDefined();
    expect(asc.financeReports).toBeDefined();
    expect(asc.subscriptionOfferCodes).toBeDefined();
    expect(asc.subscriptionOfferCodeCustomCodes).toBeDefined();
    expect(asc.subscriptionOfferCodeOneTimeUseCodes).toBeDefined();
    expect(asc.builds).toBeDefined();
    expect(asc.inAppPurchases).toBeDefined();
    expect(asc.customerReviews).toBeDefined();
    expect(asc.users).toBeDefined();
    expect(asc.betaGroups).toBeDefined();
    expect(asc.subscriptionPricePoints).toBeDefined();
    expect(asc.inAppPurchasePricePoints).toBeDefined();
    expect(asc.appPricePoints).toBeDefined();
    expect(asc.subscriptionPrices).toBeDefined();
    expect(asc.inAppPurchasePriceSchedules).toBeDefined();
    expect(asc.appPriceSchedules).toBeDefined();
  });
});

describe('AppStoreConnect request plumbing', () => {
  let privateKey: string;

  beforeAll(async () => {
    const { privateKey: pk } = await generateKeyPair('ES256', { extractable: true });
    privateKey = await exportPKCS8(pk);
  });

  it('sends Authorization: Bearer <jwt> and a default User-Agent', async () => {
    let captured: Headers | null = null;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (_url, init) => {
        captured = new Headers(init?.headers);
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await asc.apps.list();

    expect(captured).not.toBeNull();
    const auth = captured!.get('authorization');
    expect(auth).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(captured!.get('user-agent')).toBe('@winwinkit/app-store-connect-api');
  });

  it('honors a custom User-Agent', async () => {
    let captured: Headers | null = null;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      userAgent: 'acme-uploader/1.2.3',
      fetch: async (_url, init) => {
        captured = new Headers(init?.headers);
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await asc.apps.list();
    expect(captured!.get('user-agent')).toBe('acme-uploader/1.2.3');
  });

  it('honors a custom baseUrl', async () => {
    let capturedUrl: URL | null = null;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      baseUrl: 'https://proxy.example.com',
      fetch: async (input) => {
        capturedUrl = new URL(input instanceof Request ? input.url : String(input));
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await asc.apps.list();
    expect(capturedUrl!.origin).toBe('https://proxy.example.com');
    expect(capturedUrl!.pathname).toBe('/v1/apps');
  });

  it('returns undefined from request<T>() on a 204 No Content response', async () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async () => new Response(null, { status: 204 }),
    });

    const result = await asc.request('GET', '/v1/example');
    expect(result).toBeUndefined();
  });

  it('JSON-serializes the request body and sets content-type', async () => {
    let captured: { body: string | null; headers: Headers } | null = null;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (_url, init) => {
        captured = {
          body: init?.body == null ? null : String(init.body),
          headers: new Headers(init?.headers),
        };
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await asc.request('POST', '/v1/example', { body: { hello: 'world', count: 2 } });

    expect(captured).not.toBeNull();
    expect(captured!.headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(captured!.body!)).toEqual({ hello: 'world', count: 2 });
  });

  it('requestRaw() leaves the response body unconsumed for the caller', async () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async () =>
        new Response('raw-payload', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
    });

    const response = await asc.requestRaw('GET', '/v1/example');
    expect(response.bodyUsed).toBe(false);
    expect(await response.text()).toBe('raw-payload');
  });
});

describe('AppStoreConnect error mapping', () => {
  let privateKey: string;

  beforeAll(async () => {
    const { privateKey: pk } = await generateKeyPair('ES256', { extractable: true });
    privateKey = await exportPKCS8(pk);
  });

  it('captures status, errors[], and x-apple-request-uuid on non-2xx responses', async () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: false,
      fetch: async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                id: 'err-42',
                status: '403',
                code: 'FORBIDDEN_ERROR',
                title: 'This request is forbidden.',
                detail: 'Provided credentials are not permitted to access this resource.',
                source: { pointer: '/data' },
              },
            ],
          }),
          {
            status: 403,
            headers: {
              'content-type': 'application/json',
              'x-apple-request-uuid': 'req-uuid-xyz',
            },
          },
        ),
    });

    await expect(asc.apps.list()).rejects.toMatchObject({
      name: 'AppStoreConnectAPIError',
      status: 403,
      requestId: 'req-uuid-xyz',
      errors: [
        expect.objectContaining({
          code: 'FORBIDDEN_ERROR',
          status: '403',
          source: { pointer: '/data' },
        }),
      ],
    });
  });

  it('falls back to empty errors[] when the response body is not JSON', async () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: false,
      fetch: async () =>
        new Response('<html>gateway error</html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
    });

    await expect(asc.apps.list()).rejects.toMatchObject({
      name: 'AppStoreConnectAPIError',
      status: 502,
      errors: [],
    });
  });

  it('tolerates a missing x-apple-request-uuid header', async () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: false,
      fetch: async () =>
        new Response('{}', {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
    });

    await expect(asc.apps.list()).rejects.toMatchObject({
      status: 400,
      requestId: undefined,
    });
  });
});

describe('AppStoreConnect report downloads', () => {
  let privateKey: string;

  beforeAll(async () => {
    const { privateKey: pk } = await generateKeyPair('ES256', { extractable: true });
    privateKey = await exportPKCS8(pk);
  });

  it('returns a Blob from salesReports.download and sends the expected filters', async () => {
    let capturedUrl: URL | null = null;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        capturedUrl = new URL(input instanceof Request ? input.url : String(input));
        return new Response(new Blob([new Uint8Array([0x1f, 0x8b, 0x08])]), {
          status: 200,
          headers: { 'content-type': 'application/a-gzip' },
        });
      },
    });

    const blob = await asc.salesReports.download({
      'filter[vendorNumber]': ['12345678'],
      'filter[reportType]': ['SALES'],
      'filter[reportSubType]': ['SUMMARY'],
      'filter[frequency]': ['DAILY'],
      'filter[reportDate]': ['2026-04-01'],
      'filter[version]': ['1_0'],
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(capturedUrl).not.toBeNull();
    expect(capturedUrl!.pathname).toBe('/v1/salesReports');
    expect(capturedUrl!.searchParams.get('filter[vendorNumber]')).toBe('12345678');
    expect(capturedUrl!.searchParams.get('filter[reportType]')).toBe('SALES');
    expect(capturedUrl!.searchParams.get('filter[reportDate]')).toBe('2026-04-01');
  });

  it('returns a Blob from financeReports.download and sends the expected filters', async () => {
    let capturedUrl: URL | null = null;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        capturedUrl = new URL(input instanceof Request ? input.url : String(input));
        return new Response(new Blob([new Uint8Array([0x1f, 0x8b, 0x08])]), {
          status: 200,
          headers: { 'content-type': 'application/a-gzip' },
        });
      },
    });

    const blob = await asc.financeReports.download({
      'filter[vendorNumber]': ['12345678'],
      'filter[reportType]': ['FINANCIAL'],
      'filter[regionCode]': ['US'],
      'filter[reportDate]': ['2026-03'],
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(capturedUrl!.pathname).toBe('/v1/financeReports');
    expect(capturedUrl!.searchParams.get('filter[regionCode]')).toBe('US');
    expect(capturedUrl!.searchParams.get('filter[reportType]')).toBe('FINANCIAL');
  });

  it('throws AppStoreConnectAPIError on a non-2xx report response', async () => {
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                id: 'err-1',
                status: '400',
                code: 'PARAMETER_ERROR.INVALID',
                title: 'A parameter has an invalid value',
                detail: 'There is no report available for that date.',
              },
            ],
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
              'x-apple-request-uuid': 'req-abc',
            },
          },
        ),
    });

    await expect(
      asc.salesReports.download({
        'filter[vendorNumber]': ['12345678'],
        'filter[reportType]': ['SALES'],
        'filter[reportSubType]': ['SUMMARY'],
        'filter[frequency]': ['DAILY'],
      }),
    ).rejects.toMatchObject({
      name: 'AppStoreConnectAPIError',
      status: 400,
      requestId: 'req-abc',
    });
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

    expect(paths).toEqual([
      '/v1/subscriptionGroups/grp-1',
      '/v1/apps/app-9/subscriptionGroups',
      '/v1/subscriptionGroups/grp-1/subscriptions',
      '/v1/subscriptions/sub-7',
    ]);
  });

  it('hits the expected paths for subscription offer code resources', async () => {
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

    await asc.subscriptionOfferCodes.retrieve('oc-1');
    await asc.subscriptionOfferCodes.listForSubscription('sub-7');
    await asc.subscriptionOfferCodes.listPrices('oc-1');
    await asc.subscriptionOfferCodes.listCustomCodes('oc-1');
    await asc.subscriptionOfferCodes.listOneTimeUseCodes('oc-1');
    await asc.subscriptionOfferCodeCustomCodes.retrieve('cc-1');
    await asc.subscriptionOfferCodeOneTimeUseCodes.retrieve('otu-1');

    expect(paths).toEqual([
      '/v1/subscriptionOfferCodes/oc-1',
      '/v1/subscriptions/sub-7/offerCodes',
      '/v1/subscriptionOfferCodes/oc-1/prices',
      '/v1/subscriptionOfferCodes/oc-1/customCodes',
      '/v1/subscriptionOfferCodes/oc-1/oneTimeUseCodes',
      '/v1/subscriptionOfferCodeCustomCodes/cc-1',
      '/v1/subscriptionOfferCodeOneTimeUseCodes/otu-1',
    ]);
  });

  it('hits the expected paths for price management endpoints', async () => {
    const calls: Array<{ method: string; path: string; body: string | null }> = [];
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: false,
      fetch: async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        const body = init?.body == null ? null : String(init.body);
        calls.push({
          method: (init?.method ?? 'GET').toUpperCase(),
          path: url.pathname,
          body,
        });
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    // Subscription prices
    await asc.subscriptionPrices.create({ data: { type: 'subscriptionPrices' } } as never);
    await asc.subscriptionPrices.cancel('price-1');
    await asc.subscriptionPrices.listForSubscription('sub-7');
    await asc.subscriptionPricePoints.listForSubscription('sub-7');
    await asc.subscriptionPricePoints.retrieve('spp-1');

    // IAP price schedules
    await asc.inAppPurchasePriceSchedules.replace({
      data: { type: 'inAppPurchasePriceSchedules' },
    } as never);
    await asc.inAppPurchasePriceSchedules.retrieve('ips-1');
    await asc.inAppPurchasePriceSchedules.retrieveForIap('iap-1');
    await asc.inAppPurchasePricePoints.listForIap('iap-1');

    // App price schedules
    await asc.appPriceSchedules.replace({ data: { type: 'appPriceSchedules' } } as never);
    await asc.appPriceSchedules.retrieve('aps-1');
    await asc.appPriceSchedules.retrieveForApp('app-9');
    await asc.appPricePoints.listForApp('app-9');

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /v1/subscriptionPrices',
      'DELETE /v1/subscriptionPrices/price-1',
      'GET /v1/subscriptions/sub-7/prices',
      'GET /v1/subscriptions/sub-7/pricePoints',
      'GET /v1/subscriptionPricePoints/spp-1',
      'POST /v1/inAppPurchasePriceSchedules',
      'GET /v1/inAppPurchasePriceSchedules/ips-1',
      'GET /v2/inAppPurchases/iap-1/iapPriceSchedule',
      'GET /v2/inAppPurchases/iap-1/pricePoints',
      'POST /v1/appPriceSchedules',
      'GET /v1/appPriceSchedules/aps-1',
      'GET /v1/apps/app-9/appPriceSchedule',
      'GET /v1/apps/app-9/appPricePoints',
    ]);

    // POST bodies should be JSON-serialized.
    const subPost = calls.find((c) => c.path === '/v1/subscriptionPrices');
    expect(subPost?.body).not.toBeNull();
    expect(JSON.parse(subPost!.body!)).toMatchObject({ data: { type: 'subscriptionPrices' } });
  });

  it('hits the expected paths for builds, IAPs, reviews, users, beta groups', async () => {
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

    await asc.builds.retrieve('b-1');
    await asc.builds.list();
    await asc.builds.listForApp('app-9');
    await asc.inAppPurchases.retrieve('iap-1');
    await asc.inAppPurchases.listForApp('app-9');
    await asc.customerReviews.retrieve('rev-1');
    await asc.customerReviews.listForApp('app-9');
    await asc.users.retrieve('u-1');
    await asc.users.list();
    await asc.betaGroups.retrieve('bg-1');
    await asc.betaGroups.list();
    await asc.betaGroups.listForApp('app-9');
    await asc.betaGroups.listTesters('bg-1');
    await asc.betaGroups.listBuilds('bg-1');

    expect(paths).toEqual([
      '/v1/builds/b-1',
      '/v1/builds',
      '/v1/apps/app-9/builds',
      '/v2/inAppPurchases/iap-1',
      '/v1/apps/app-9/inAppPurchasesV2',
      '/v1/customerReviews/rev-1',
      '/v1/apps/app-9/customerReviews',
      '/v1/users/u-1',
      '/v1/users',
      '/v1/betaGroups/bg-1',
      '/v1/betaGroups',
      '/v1/apps/app-9/betaGroups',
      '/v1/betaGroups/bg-1/betaTesters',
      '/v1/betaGroups/bg-1/builds',
    ]);
  });

  it('retries 429 on GET until success, honoring Retry-After: 0', async () => {
    const attempts: number[] = [];
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: { maxAttempts: 4, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: async () => {
        attempts.push(call);
        call++;
        if (call <= 2) {
          return new Response('{"errors":[]}', {
            status: 429,
            headers: { 'content-type': 'application/json', 'retry-after': '0' },
          });
        }
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const result = await asc.apps.list();
    expect(attempts).toHaveLength(3);
    expect((result as { data: unknown[] }).data).toEqual([]);
  });

  it('throws AppStoreConnectAPIError when retries are exhausted', async () => {
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: async () => {
        call++;
        return new Response('{"errors":[]}', {
          status: 503,
          headers: { 'content-type': 'application/json', 'retry-after': '0' },
        });
      },
    });

    await expect(asc.apps.list()).rejects.toMatchObject({
      name: 'AppStoreConnectAPIError',
      status: 503,
    });
    expect(call).toBe(3);
  });

  it('does not retry non-idempotent methods on 5xx', async () => {
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: { maxAttempts: 4, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: async () => {
        call++;
        return new Response('{"errors":[]}', {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await expect(
      asc.request('POST', '/v1/example', { body: { foo: 'bar' } }),
    ).rejects.toMatchObject({ status: 500 });
    expect(call).toBe(1);
  });

  it('does retry non-idempotent methods on 429', async () => {
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: async () => {
        call++;
        if (call === 1) {
          return new Response('{"errors":[]}', {
            status: 429,
            headers: { 'content-type': 'application/json', 'retry-after': '0' },
          });
        }
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await asc.request('POST', '/v1/example', { body: { foo: 'bar' } });
    expect(call).toBe(2);
  });

  it('does not retry ordinary 4xx responses', async () => {
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: { maxAttempts: 4, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: async () => {
        call++;
        return new Response('{"errors":[]}', {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await expect(asc.apps.retrieve('missing')).rejects.toMatchObject({ status: 404 });
    expect(call).toBe(1);
  });

  it('disables retries when retry: false', async () => {
    let call = 0;
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      retry: false,
      fetch: async () => {
        call++;
        return new Response('{"errors":[]}', {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '0' },
        });
      },
    });

    await expect(asc.apps.list()).rejects.toMatchObject({ status: 429 });
    expect(call).toBe(1);
  });

  it('retrieves one-time-use-code values as CSV text', async () => {
    let capturedUrl: URL | null = null;
    const csv = 'code\nABCD-EFGH-1234\nWXYZ-5678-QRST\n';
    const asc = new AppStoreConnect({
      keyId: 'K',
      issuerId: 'I',
      privateKey,
      fetch: async (input) => {
        capturedUrl = new URL(input instanceof Request ? input.url : String(input));
        return new Response(csv, {
          status: 200,
          headers: { 'content-type': 'text/csv' },
        });
      },
    });

    const values = await asc.subscriptionOfferCodeOneTimeUseCodes.retrieveValues('otu-42');

    expect(values).toBe(csv);
    expect(capturedUrl!.pathname).toBe('/v1/subscriptionOfferCodeOneTimeUseCodes/otu-42/values');
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
