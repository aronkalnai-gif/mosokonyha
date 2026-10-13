# 🧺 Mosókonyha

A web page for the dorm's laundry rooms. It shows which floor's laundry key is free right now, so you don't have to walk down to the reception to check. It works in any phone browser, with nothing to install. Optionally, students can add it to their home screen and it then opens like an app.

## How it works

| | |
|---|---|
| **Sign in** | With a BME e-mail address (`@edu.bme.hu`), using a one-time code. Címtár (SAML) login is planned, see below. |
| **Key list** | All 6 floors live: free or taken, who has the key, since when, and a bar showing how much of the 4 hours has passed. |
| **Picking up a key** | Scan the printed QR code at the reception with the phone's camera. It opens the page's *Recepció* screen; tap the floor whose key you're taking. A moving proof screen appears; show it to the receptionist. The 4 hours start now. You can also tap *Kulcs felvétele* on a floor and scan inside the page. |
| **Returning a key** | Scan the same QR code again and tap *Kulcs visszaadása*. The proof screen shows the return time and any fee to pay. |
| **Overtime** | After 4 hours the page shows how long you're over and the fee: 500 Ft for every **started** 30 minutes. |
| **Laundry room** | While you hold a key, you see the machines of your floor: 2 washers and 1 dryer, or 1 washer and 1 dryer on the 4th floor. Tap a machine to start a countdown timer. |
| **Notifications** | Push notifications 15 minutes before your key time ends, when it ends, when a machine timer finishes, and, if you tapped *Szólj, ha szabad*, when a key is returned. They arrive even when the page is closed. |
| **Language** | Hungarian and English. |
| **Admins** | Can free a key that someone forgot to return. |

### Notifications on different phones

- **Android (Chrome, Samsung Internet, Firefox):** works in the normal browser after tapping *Bekapcsolás*.
- **iPhone (iOS 16.4 or newer):** Apple only allows notifications for pages added to the Home Screen: *Share → Add to Home Screen*, then open it from there. The page explains this to iPhone users.
- A web page can't show a live countdown on the lock screen like an installed app could. Instead, the notifications arrive at the right moments.

### Why the proof screen moves

The QR code is printed, so anyone could photograph it, or keep the link. The proof screen has a pulsing background, a spinning icon and a ticking clock. The receptionist can tell at a glance that it's the live page and not a screenshot. If the code gets around, generate a new secret and print a new code (see *QR code* below).

## Tech

- **Website:** Expo Router (React Native for Web, TypeScript), built into a static site. Code is in `src/`. Static files (manifest, icons, service worker) are in `public/`.
- **Backend:** [Supabase](https://supabase.com) (Postgres, auth, realtime, Edge Functions, cron). The free tier is enough. The schema and all rules are in `supabase/migrations/`.
- Picking up and returning keys go through database functions (`checkout_key`, `return_key`). These check the QR secret and prevent two people taking the same key.
- **Notifications:** the database queues them, with the time each is due, in `private.push_outbox`. Every 15 seconds `pg_cron` checks for due messages and, if there are any, calls the `send-pushes` Edge Function. That function sends them as Web Push messages, and `public/sw.js` shows them on the phone.

## Setup

### 1. Supabase

1. Create a project at supabase.com.
2. Enable the **pg_net** and **pg_cron** extensions (Database → Extensions).
3. In the **SQL editor**, run `supabase/migrations/20261013000000_init.sql`. Or use the Supabase CLI: `supabase link` and then `supabase db push`.
4. **Authentication → Sign In / Providers → Email:** keep it enabled. **Authentication → Emails → Magic link** template: make sure the body contains the code `{{ .Token }}`, because the page asks for the code, not a link. Example:
   ```html
   <h2>Mosókonyha belépés</h2>
   <p>A belépőkódod: <strong>{{ .Token }}</strong></p>
   ```
5. **Authentication → Emails → SMTP settings:** set up your own SMTP server. Supabase's built-in e-mail sender is limited to a few e-mails per hour, which is too few for a dorm. Brevo or Resend free tiers both work.
6. **Authentication → URL Configuration:** set the *Site URL* to your site's address.

### 2. Push notifications

```bash
npx web-push generate-vapid-keys          # prints a public and a private key
openssl rand -hex 24                      # a random CRON_SECRET

npx supabase secrets set \
  VAPID_PUBLIC_KEY=<public key> \
  VAPID_PRIVATE_KEY=<private key> \
  VAPID_SUBJECT=mailto:you@edu.bme.hu \
  CRON_SECRET=<random secret>
npx supabase functions deploy send-pushes --no-verify-jwt
```

Then, in the SQL editor, tell the cron job where to find the function:

```sql
select vault.create_secret('https://YOUR-PROJECT.supabase.co', 'project_url');
select vault.create_secret('<the same CRON_SECRET>', 'cron_secret');
```

### 3. Website

```bash
cp .env.example .env     # Supabase URL + publishable key + VAPID public key
npm install
npm start                # local development at http://localhost:8081
npm run build            # static site in dist/
```

**Hosting.** Any static host works. The free plans of these need no changes:

- **Vercel:** import the GitHub repo. `vercel.json` already sets the build. Add the three `EXPO_PUBLIC_…` variables under *Environment Variables*.
- **Netlify** or **Cloudflare Pages:** build command `npx expo export --platform web`, output directory `dist`, and the same three environment variables. `public/_redirects` handles page routes.

The site must run on **HTTPS** for the camera and notifications. All three hosts provide it automatically.

### 4. QR code

```sql
select value from private.secrets where name = 'reception_qr';
```

Open `tools/reception-qr.html` in a browser, enter your site's address and the secret, and print the page. The QR code is a link to `https://<your site>/qr?c=<secret>`.

To invalidate the printed code (for example, if a photo of it was shared):

```sql
update private.secrets set value = encode(extensions.gen_random_bytes(18), 'hex') where name = 'reception_qr';
```

### 5. Admins

After your first sign-in:

```sql
update profiles set is_admin = true where email = 'you@edu.bme.hu';
```

## Settings

The rules are in the `app_settings` table and can be changed at any time:

```sql
update app_settings set key_minutes = 240, fee_huf = 500, fee_block_minutes = 30, grace_minutes = 0;
```

`grace_minutes` sets a tolerance period before fees start, for example 5 minutes.

## Known limitations and next steps

- **Paper-form pickups:** keys taken without the page don't show up in it. The page only works well if everyone uses it, or if the reception stops the paper form.
- **Forgotten returns:** if someone gives back the key but doesn't scan, the key stays "taken" until an admin frees it.
- **The QR link can be shared:** anyone who has the QR link (from a photo or their browser history) can "scan" from their room. The proof screen and rotating the secret are the safeguards.
- **Címtár (BME SSO):** needs the site to be registered as a SAML service provider with BME IT (Címtár / eduID). Once approved, the e-mail code login can be replaced. Note that Supabase's built-in SAML is a paid (Pro) feature; a small custom SAML endpoint is the free alternative.
