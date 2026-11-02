# Enabling Google Sign-In with the Firebase CLI only

Everything below was done **without the Firebase/Google web consoles**, using
`firebase-tools` (v15.31.0) as code. Project: `candid-assist`.

## 1. Declare the provider in `firebase.json`

The Auth emulator emulator suite already lives there; add an `auth` section
with the providers you want as code:

```json
{
  "auth": {
    "providers": {
      "emailPasswordSignIn": {},
      "googleSignIn": {
        "oAuthBrandDisplayName": "Human Assist",
        "supportEmail": "support@candidchoice.ai"
      }
    }
  }
}
```

Notes:
- `googleSignIn.oAuthBrandDisplayName` + `supportEmail` are what the CLI uses
  to auto-provision the OAuth **consent screen** on the project's Google Cloud
  counterpart. No manual consent-screen clicking required.
- `emailPasswordSignIn` is the second provider (enabled by default on new
  projects; declaring it keeps it as code).

## 2. Deploy the auth config

```bash
npx firebase-tools deploy --only auth --project candid-assist
```

Observed output:

```
i  deploying auth
No Firebase Web App found. Creating 'Default Web App' for Auth provisioning...
Enabling auth providers: Google sign-in...
✔  Auth providers enabled: Google sign-in
✔  Deploy complete!
```

The CLI **auto-created the Default Web App** it needs for auth provisioning —
another thing you'd otherwise do by hand in the console.

## 3. Retrieve the web app config (for the client SDK)

```bash
npx firebase-tools apps:list --project candid-assist
# → Default Web App  1:367635733659:web:f34c6cd8a12aa075077a3e

npx firebase-tools apps:sdkconfig WEB 1:367635733659:web:f34c6cd8a12aa075077a3e \
  --project candid-assist
```

Resulting values (paste-ready):

```
apiKey            AIzaSyDisNcYiROgryzQiq-ZEkOf4vJQ00yv2L4
projectId         candid-assist
authDomain        candid-assist.firebaseapp.com
storageBucket     candid-assist.firebasestorage.app
messagingSenderId 367635733659
```

These go into `apps/desktop-renderer/.env.local` as `NEXT_PUBLIC_FIREBASE_*`
(env-driven; the renderer's Google button uses the native Firebase popup when
present, and falls back to the backend OAuth flow otherwise).

## 4. Where the CLI can't fully replace the console

- OAuth **consent-screen publishing status** (Testing → In production) and
  unusual branding/scopes edits — the CLI covers the basics above.
- Custom/extra OAuth clients, Android SHA-1 fingerprints.
- Authorized domains beyond defaults (`localhost` works out of the box;
  custom production domains may need the console).

## 5. One-time CLI prerequisites (done already)

```bash
npm i -g firebase-tools   # or use npx as above
firebase login            # interactive browser login, once per machine
```

Check state with:

```bash
npx firebase-tools projects:list   # 14 projects visible on this account
```
