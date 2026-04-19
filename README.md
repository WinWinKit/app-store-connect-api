# app-store-connect-api

TypeScript client for the [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi) with a resource-oriented, fluent interface.

> Status: pre-alpha. Interfaces are unstable until `0.1.0`.

## Install

```sh
pnpm add @winwinkit/app-store-connect-api
```

## Usage

```ts
import { AppStoreConnect } from '@winwinkit/app-store-connect-api';

const asc = new AppStoreConnect({
  keyId: 'ABC123DEFG',
  issuerId: '57246542-96fe-1a63-e053-0824d011072a',
  privateKey: `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgEvL...
-----END PRIVATE KEY-----`,
});

const apps = await asc.apps.list();
const app = await asc.apps.retrieve('1234567890');
```

## Design goals

- **Resource-oriented ergonomics.** Resource objects (`asc.apps`, `asc.inAppPurchases`, ...) over raw paths.
- **Typed.** End-to-end types, generated from Apple's OpenAPI spec (coming soon).
- **Runtime agnostic.** Uses the platform `fetch`; works in Node 18+, Bun, Deno, Cloudflare Workers, edge runtimes.
- **Minimal dependencies.** Only `jose` for ES256 JWT signing.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
