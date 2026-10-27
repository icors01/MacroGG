# Deploying MacroGG safely

## Vercel configuration

Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in Vercel environment settings.
Never use `VITE_GEMINI_API_KEY`: every `VITE_` value can be included in browser JavaScript.
The Gemini key must be restricted to the Generative Language API in Google Cloud.
HTTP referrer restrictions are for browser keys, not this server-side integration.
Set provider quotas and billing alerts; an alert does not cap spending.

Set the `VITE_FIREBASE_*` variables listed in `.env.example`, including
`VITE_FIREBASE_PROJECT_ID`. The API also uses that project ID to verify Firebase
ID tokens. Firebase web configuration is public by design. Its security depends
on Authentication, Firestore rules, authorized domains and appropriate API restrictions.
Use the same Firebase project for frontend and API. Redeploy after changing settings.

## Firebase access controls

`firestore.rules` is a deny-by-default ruleset for this repository's actual paths.
Review it and publish it through Firebase Console → Firestore Database → Rules.
Adding the file to Git or deploying Vercel does **not** publish Firestore rules.
It allows authenticated users (including guests) to access only their own
settings, daily logs and legacy journal migration documents. Legacy reset and
verification documents have no client access.

Before applying rules to production, use a test Firebase project or emulator to
verify that account A cannot read, query, create, update or delete account B's
records; signed-out access is denied; and a user can query their own log history.
Anonymous IDs count as accounts; losing a guest session can lose access to its data.

Enable Email/Password Authentication, configure authorized deployment domains,
and enable email enumeration protection and a suitable server-enforced password
policy in Firebase. Signup and password reset now use Firebase-hosted email links;
EmailJS and `/api/send-email` are no longer used. The retired endpoint returns 410.
Verification email failure does not delete the newly created account. Email
verification is not currently required to use the journal.

## Abuse controls

All three AI endpoints verify signed Firebase ID tokens with Google's public
signing keys and validate issuer, project, subject and expiration. Clients send
short-lived tokens in Authorization headers. Tokens are never placed in URLs.
This verifies token integrity and expiration, not immediate account revocation.

A shared per-process counter limits a UID to 10 AI requests/minute across endpoints.
It is **not a distributed quota**: serverless instances and restarts have separate
counters. Anonymous signup can also create new UIDs. Configure Vercel Firewall
rate limits/bot protection for `/api/*` and provider-side usage quotas before
relying on these features at scale. Consider verified-account-only AI or Firebase
App Check if guest abuse occurs. Origin/CORS checks alone cannot prevent direct calls.

Vercel headers block framing and MIME sniffing and restrict object embedding,
base URLs and unused device permissions. This is a limited CSP, not complete XSS
protection. Camera remains available to the scanner. Keep Vercel deployment
protection enabled for private previews where appropriate.

## Historical exposure and required cleanup

The local Git history contains a previously hardcoded **Gemini** API key in
`src/App.jsx`, as well as public Firebase web configuration. Treat the old Gemini
key as compromised: revoke it in Google Cloud, check usage/billing, create a
restricted replacement, set it only as `GEMINI_API_KEY` in Vercel, and redeploy.
The review does not print, test or reuse old credentials. Deleting source files
or rewriting history cannot invalidate a copied key; rotation is essential.

Previous releases also used client-controlled verification codes and documented
legacy plaintext password-reset records. Through a trusted Firebase admin process,
remove obsolete `verifications` and `password_resets` records without logging their
contents. If password records were accessible, reset affected credentials. Existing
EmailJS identifiers were browser-visible; review/disable the old EmailJS service
and template to prevent external use even after this application's integration is removed.

## Verification

Run `node --test tests/*.test.js`, `npm run build`, and `npm audit`.
Use a disposable authorized account to check signup, verification-link delivery,
reset-link delivery, login and data retention. Email and AI live calls incur external
operations and are not established by mocked tests. Never use real users' data for testing.

The repository review cannot establish the currently published Firestore rules,
Vercel variables/firewall settings, old key revocation or production email delivery.
See `SECURITY.md` for review scope and remaining work.
