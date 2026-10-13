# 🧺 Mosókonyha

Android app for the dorm's laundry rooms. It shows which floor's laundry key is free right now, so you don't have to walk down to the reception to check.

## How it works

| | |
|---|---|
| **Sign in** | With a BME e-mail address (`@edu.bme.hu`), using a one-time code. Címtár (SAML) login is planned, see below. |
| **Key list** | All 6 floors live: free or taken, who has the key, since when, and a bar showing how much of the 4 hours has passed. |
| **Picking up a key** | Tap *Kulcs felvétele* on a free floor, then scan the printed QR code at the reception. A moving proof screen appears; show it to the receptionist. The 4 hours start now. |
| **Returning a key** | Tap *Kulcs visszaadása* and scan the same QR code again. The proof screen shows the return time and any fee to pay. |
| **Overtime** | After 4 hours the app shows how long you're over and the fee: 500 Ft for every **started** 30 minutes. |
| **Laundry room** | While you hold a key, you see the machines of your floor: 2 washers and 1 dryer, or 1 washer and 1 dryer on the 4th floor. Tap a machine to start a countdown timer. |
| **Lock screen** | The key's countdown and every running machine timer appear as live countdowns in the notification area and on the lock screen. An alert fires when a machine finishes. |
| **Reminders** | 15 minutes before the key time ends, and again when it ends. |
| **Notify me when free** | On a taken floor, tap *Szólj, ha szabad* to get a push notification when that key is returned. |
| **Language** | Hungarian and English. |
| **Admins** | Can free a key that someone forgot to return in the app. |

### Why the proof screen moves

The QR code is printed, so anyone could photograph it. The proof screen has a pulsing background, a spinning icon and a ticking clock. The receptionist can tell at a glance that it's the live app and not a screenshot. If a photo of the QR code gets around, generate a new secret and print a new code (see *QR code* below).

## Tech

- **App:** Expo (React Native, TypeScript, Expo Router). Code is in `src/`.
- **Lock-screen countdowns:** a small native Android module (`modules/live-timer`) that shows ongoing notifications with a system countdown. They keep ticking even when the app is closed.
- **Backend:** [Supabase](https://supabase.com) (Postgres, auth, realtime). The free tier is enough. The schema and all rules are in `supabase/migrations/`.
- Picking up and returning keys go through database functions (`checkout_key`, `return_key`). These check the QR secret and prevent two people taking the same key. Push notifications are sent from the database through Expo's push service.

## Setup

### 1. Supabase

1. Create a project at supabase.com.
2. In the **SQL editor**, run `supabase/migrations/20261013000000_init.sql`. Or use the Supabase CLI: `supabase link` and then `supabase db push`.
3. **Authentication → Sign In / Providers → Email:** keep it enabled. **Authentication → Emails → Magic link** template: make sure the body contains the code `{{ .Token }}`, because the app asks for the code, not a link. Example:
   ```html
   <h2>Mosókonyha belépés</h2>
   <p>A belépőkódod: <strong>{{ .Token }}</strong></p>
   ```
4. **Authentication → Emails → SMTP settings:** set up your own SMTP server. Supabase's built-in e-mail sender is limited to a few e-mails per hour, which is too few for a dorm. Brevo or Resend free tiers both work.
5. Make yourself an admin after your first sign-in:
   ```sql
   update profiles set is_admin = true where email = 'you@edu.bme.hu';
   ```

### 2. QR code

```sql
select value from private.secrets where name = 'reception_qr';
```

Open `tools/reception-qr.html` in a browser, paste the secret, and print the page.

To invalidate the printed code (for example, if a photo of it was shared):

```sql
update private.secrets set value = encode(extensions.gen_random_bytes(18), 'hex') where name = 'reception_qr';
```

### 3. Run the app

```bash
cp .env.example .env          # fill in the Supabase URL and publishable key
npm install
npx expo run:android          # needs Android Studio / an Android phone with USB debugging
```

The app has its own native code (the lock-screen module), so **Expo Go won't show the lock-screen countdowns**. Use `expo run:android` or an EAS build.

### 4. Build an APK to share (no Android Studio needed)

```bash
npx eas-cli login
npx eas-cli init                                   # creates the Expo project, prints the project id
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://...
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_KEY --value sb_publishable_...
npx eas-cli build -p android --profile preview     # gives you a link to an .apk
```

### 5. Push notifications ("Szólj, ha szabad")

Android push needs Firebase:

1. Create a Firebase project and add an Android app with the package name `hu.mosokonyha.app`.
2. Download `google-services.json` into the project root. It is git-ignored and picked up automatically by `app.config.js`.
3. Upload the FCM V1 service account key to Expo: `npx eas-cli credentials` → Android → *Google Service Account* → *FCM V1*.
4. Rebuild the app.

Everything else (timers, reminders, lock-screen countdowns) works without Firebase.

## Settings

The rules are in the `app_settings` table and can be changed at any time:

```sql
update app_settings set key_minutes = 240, fee_huf = 500, fee_block_minutes = 30, grace_minutes = 0;
```

`grace_minutes` sets a tolerance period before fees start, for example 5 minutes.

## Known limitations and next steps

- **Paper-form pickups:** keys taken without the app don't show up in the app. The app only works well if everyone uses it, or if the reception stops the paper form.
- **Forgotten returns:** if someone gives back the key but doesn't scan, the key stays "taken" until an admin frees it.
- **Címtár (BME SSO):** needs the app to be registered as a SAML service provider with BME IT (Címtár / eduID). Once approved, the e-mail code login can be replaced. Note that Supabase's built-in SAML is a paid (Pro) feature; a small custom SAML endpoint is the free alternative.
- **iPhone:** the app is cross-platform, but the lock-screen module is Android only. On iOS this would be a Live Activity widget.
