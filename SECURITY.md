# Security review

This repository has received a source/dependency review, not a penetration test
or a guarantee that the deployed service is secure.

## Fixed in this review

- All AI routes now require cryptographically verified Firebase ID tokens for
  the configured project. Guest accounts remain supported.
- Added server-side per-UID request limiting, input/output bounds for food estimates,
  a provider timeout and sanitized provider errors. This counter is per instance;
  it does not replace shared edge limits or provider quotas.
- Moved Gemini credentials from the food endpoint's request URL to a header.
- Replaced browser-controlled signup codes and hardcoded EmailJS integration with
  Firebase email-verification links. Guest upgrades retain their existing UID.
- Retired the unused arbitrary-code email endpoint (410 Gone).
- Added owner-only Firestore rules for settings, logs and legacy migration paths.
  **These rules are not deployed by Vercel.**
- Added Vercel response headers to prevent framing/MIME sniffing and restrict
  object embedding and unused device permissions. CSP is deliberately partial.
- Removed unused root `main.js`, broadened environment-file ignores, corrected
  misleading deployment documentation and added weekly dependency update checks.
- Updated compatible dependencies. Firebase 10 pins older Node networking
  dependencies; overrides select patched versions within Undici 6 and grpc-js 1.
  Reevaluate those overrides when upgrading Firebase.

## Important outstanding actions

1. Revoke/replace the historical Gemini key found in Git history (`src/App.jsx`).
   Review provider usage and billing. Do not assume a server-side key is new or safe
   merely because the current code no longer hardcodes it.
2. Publish and test `firestore.rules` in the correct Firebase project. Verify
   two-account isolation and signed-out denial using an emulator/test project.
   The review could not inspect currently deployed rules or production data.
3. Remove legacy verification/password-reset records using trusted admin access.
   Assess any previous plaintext-password exposure and reset affected credentials.
4. Disable/restrict the old EmailJS template/service. Browser-visible identifiers
   existed in previous source and history; removing this client does not revoke them.
5. Configure shared Vercel WAF/rate limits and Gemini quotas. Guests can create
   new IDs, and serverless instances do not share the local rate counter.
6. Review Firebase authorized domains, API restrictions, password policy and email
   enumeration protection. Restrict private Vercel previews appropriately.

## What was verified

- `npm test`: 52 passing tests, including forged/expired/wrong-project tokens,
  unauthorized endpoint rejection, server-side limits, and sanitized AI errors.
- `npm run build`: successful production build. Existing chunk-size warning remains.
- `npm audit`: zero reported vulnerabilities after dependency updates at review time.
  This is a point-in-time advisory check, not proof of absence of vulnerabilities.
- Browser fixture with mocked Firebase: guest account linking retains UID, settings
  are merged, verification is delegated to Firebase, failed email delivery is
  reported without pretending account creation failed, and API calls attach a token.
- Pattern scan of local Git history found the historical Gemini key and public
  Firebase configuration; no values were printed or tested. Pattern scanning does
  not detect every possible credential format.

Live verification emails, AI billing operations, production access rules,
immediate token revocation, Vercel deployment settings and real two-account data
isolation were not tested. Signed tokens are checked for signature and expiration;
revoked/disabled accounts can retain API access until their existing token expires.

See [deployment instructions](DEPLOYMENT.md) for the console steps. Do not post
secrets, raw tokens, private user data or database exports in public issues.

## AI availability update

Food entry retries a temporary Google 500/502/503/504 once. If that retry fails
(or the configured model returns 404), it lists models using the same server-side
key and tries at most one other plain Flash model advertising generateContent.
It does not bypass authentication, permission or quota errors. All calls share a
25-second deadline; only the final successful result is returned for journal saving.
Model discovery confirms advertised availability, not guaranteed capacity or schema
support. No production key or real AI generation was used in the regression tests.
