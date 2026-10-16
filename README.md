# 🧺 Mosókonyha

A web page for the dorm's laundry rooms. It shows which floor's laundry key is free right now, so you don't have to walk down to the reception to check. The reception's paper form stays as it is; the page only tells students about each other's keys. It works in any phone browser, with nothing to install. Optionally, students can add it to their home screen and it then opens like an app.

## How it works

| | |
|---|---|
| **Looking** | Anyone with the link sees right away which floors' keys are free or taken, and since when. No login. |
| **Account (optional)** | *Bejelentkezés* at the top lets people create an e-mail + password account or log in on another device. With an account, the name and room number are filled in automatically, so a pickup is just a scan. If someone already used the page on that phone, creating an account keeps that identity, including a key they hold. |
| **Favourite floor** | Chosen in Settings. A banner at the top of the list shows whether that floor's key is free, with *Kulcs felvétele* or *Szólj, ha szabad*. Kept on the account across devices. |
| **Messages** | On a taken floor, *Üzenet* opens a chat with whoever holds that key ("Could I take the key after you?"). Quick replies or free text; the other person gets a notification. Only people who have picked up a key can write, so everyone sees each other's name and room. Limits: 500 characters per message, 30 messages per hour; messages are deleted after 14 days. |
| **First pickup** | The first time you pick up a key you scan the QR code, then type your name and room number once. The browser remembers you; later pickups are just a scan. People who have picked up a key at least once also see who holds which key (name and room number); others only see free/taken. |
| **Key list** | All 6 floors live: free or taken, who has the key, since when, and a bar showing how much of the 4 hours has passed. |
| **Picking up a key** | Sign the paper form as usual. Then either tap *Kulcs felvétele* on a free floor and scan the QR code inside the page, or scan the printed QR code with the phone's camera, which opens the *Recepció* page where you tap the floor. The 4 hours start now, and the page opens your laundry room. The scan makes sure only someone at the reception can mark a key as taken. |
| **Returning a key** | Scan the same QR code again and tap *Kulcs visszaadása*. The key shows as free for everyone, and you see whether you went over time and the fee. |
| **Overtime** | After 4 hours the page shows how long you're over and the fee: 500 Ft for every **started** 30 minutes. |
| **Laundry room** | While you hold a key, you see the machines of your floor: 2 washers and 1 dryer, or 1 washer and 1 dryer on the 4th floor. Tap a machine to start a countdown timer. |
| **Notifications** | Push notifications 15 minutes before your key time ends, when it ends, when a machine timer finishes, and, if you tapped *Szólj, ha szabad*, when a key is returned. They arrive even when the page is closed. |
| **Language** | Hungarian and English. |
| **Admins** | Can free a key that someone forgot to return. |

### Notifications on different phones

- **Android (Chrome, Samsung Internet, Firefox):** works in the normal browser after tapping *Bekapcsolás*.
- **iPhone (iOS 16.4 or newer):** Apple only allows notifications for pages added to the Home Screen: *Share → Add to Home Screen*, then open it from there. The page explains this to iPhone users.
- A web page can't show a live countdown on the lock screen like an installed app could. Instead, the notifications arrive at the right moments.

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
4. **Authentication → Sign In / Providers:** turn on **Allow anonymous sign-ins** (people who don't create an account) and keep **Email** enabled (for the optional e-mail + password accounts). In the Email provider, turn **Confirm email** off: otherwise every new account needs a confirmation e-mail, which needs your own SMTP server (Supabase's built-in sender only allows a few per hour).
5. **Authentication → Rate Limits:** the default allows 30 anonymous sign-ins per hour per IP address. If the whole dorm shares one internet address, raise it (for example to 200) for the first days, when everyone joins at once.

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

After you've joined with your name:

```sql
update profiles set is_admin = true where display_name = 'Your Name';
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
- **The QR link can be shared:** anyone who has the QR link (from a photo or their browser history) can "scan" from their room. If that happens, rotate the secret and print a new code.
- **Names aren't checked:** anyone at the reception can join with any name. For telling each other which key is free, that's usually enough.
- **Joining again:** the browser remembers you. If someone clears their browser data, uses another phone, or (on iPhone in Safari) doesn't open the page for about 7 days, they scan the QR code again and join as a new person. A key held by their old identity can be freed by an admin.
