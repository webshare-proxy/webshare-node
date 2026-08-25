# Releasing `@webshare-proxy/sdk`

## Versioning policy

We follow [Semantic Versioning](https://semver.org). While the SDK is on `0.x`
the public API is not yet frozen: **minor** bumps (`0.1 → 0.2`) may contain
breaking changes, **patch** bumps (`0.1.0 → 0.1.1`) never do. Once the API is
settled we cut `1.0.0`, after which:

- **major** — a breaking change to the public API (removed/renamed export,
  changed method signature, changed runtime behaviour a caller could rely on).
- **minor** — backwards-compatible new functionality.
- **patch** — backwards-compatible bug fixes.

Anything importable from the package root (`@webshare-proxy/sdk`) is public API.
Type-only widening is not breaking; type-only narrowing is.

## How to cut a release

Publishing is fully automated — a pushed tag is the only trigger. Never run
`npm publish` from a laptop (except the one-time bootstrap below).

1. Update `CHANGELOG.md` (move items from _Unreleased_ into a new version
   heading).
2. Bump the version: `npm version <patch|minor|major> -m "Release v%s"`.
   This edits `package.json` and creates a matching `vX.Y.Z` git tag.
3. Push the commit and the tag: `git push origin main --follow-tags`.
4. The **Release** workflow builds, tests, and publishes to npm with
   [provenance](https://docs.npmjs.com/generating-provenance-statements). Watch
   it in the Actions tab; the listing appears at
   <https://www.npmjs.com/package/@webshare-proxy/sdk>.

The workflow fails fast if the tag and `package.json` version disagree.

## Credentials

**None stored.** Publishing uses
[npm OIDC Trusted Publishing](https://docs.npmjs.com/trusted-publishers): npm is
configured to trust this repo's `release.yml` workflow (running in the `release`
environment) and mints a short-lived credential from GitHub's OIDC token at
publish time. Provenance is attached automatically.

### One-time bootstrap (first publish only)

npm can only attach a trusted publisher to a package that already exists, so the
very first version is published manually by an org owner:

```bash
npm login                 # org-owned account, with 2FA
npm publish               # from a clean checkout; access:public is in package.json
```

Then, on npmjs.com: **Package → Settings → Trusted Publisher → GitHub Actions**,
with owner `webshare-proxy`, repo `webshare-node`, workflow `release.yml`,
environment `release`. Every release after that is fully automated.
