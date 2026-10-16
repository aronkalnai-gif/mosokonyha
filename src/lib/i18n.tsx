import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const hu = {
  appName: 'Mosókonyha',
  keys: 'Kulcsok',
  loading: 'Betöltés…',
  cancel: 'Mégse',
  ok: 'OK',
  save: 'Mentés',
  back: 'Vissza',

  // Joining
  joinButton: 'Tovább',
  joinTitleFloor: '{floor}. emeleti kulcs',
  joinAndPickUp: 'Kulcs felvétele',
  nameTitle: 'Ki vagy?',
  nameIntro: 'Csak az első alkalommal kell megadnod. A neved és a szobaszámod látják a többiek, amíg nálad van a kulcs – mint a recepciós füzetben.',
  namePlaceholder: 'Teljes név',
  roomLabel: 'Szobaszám',
  roomPlaceholder: 'pl. 312',

  // Home
  myKey: 'Nálad lévő kulcs',
  floor: '{floor}. emelet',
  free: 'Szabad',
  taken: 'Foglalt',
  you: 'te',
  pickUpKey: 'Kulcs felvétele',
  openRoom: 'Mosókonyha',
  returnKey: 'Kulcs visszaadása',
  returnShort: 'Visszaadás',
  since: 'felvéve {time}',
  remaining: 'Még {time}',
  overdueBy: 'Túllépés: {time}',
  toPay: 'Fizetendő: {fee}',
  notifyMe: 'Szólj, ha szabad',
  notifying: 'Szólunk, ha szabad',
  forceReturn: 'Kulcs felszabadítása',
  forceReturnConfirm: 'Biztosan felszabadítod a(z) {floor}. emeleti kulcsot ({name})?',
  holdingOther: 'Egyszerre csak egy kulcs lehet nálad.',
  freeCount: '{n} szabad kulcs',
  freeOf: '{n} szabad kulcs a {total}-ból',
  floorWord: 'emelet',
  yours: 'Nálad',
  machinesSummary: '{n} mosógép · 1 szárító',
  machinesSummary1: '1 mosógép · 1 szárító',
  toPayLabel: 'Fizetendő',
  timer: 'Időzítő',
  noneFree: 'Most minden kulcs foglalt',

  // Scan
  scanPickupTitle: 'Kulcs felvétele – {floor}. emelet',
  scanReturnTitle: 'Kulcs visszaadása',
  scanHint: 'Olvasd be a recepción kihelyezett QR-kódot.',
  cameraNeeded: 'A QR-kód beolvasásához kamera-hozzáférés kell.',
  allowCamera: 'Kamera engedélyezése',
  wrongQr: 'Ez nem a mosókonyha QR-kódja.',
  processing: 'Feldolgozás…',

  // After returning a key
  keyReturned: 'Visszaadtad a(z) {floor}. emeleti kulcsot',
  returnedOnTime: 'Időben visszahoztad, nincs mit fizetned. Köszi!',
  returnedWithFee: 'Túllépés: {min} perc. Fizetendő a recepción: {fee}.',

  // Room
  roomTitle: '{floor}. emeleti mosókonyha',
  washer: '{n}. mosógép',
  dryer: 'Szárítógép',
  idle: 'Nem fut',
  tapToStart: 'Koppints egy gépre az időzítő beállításához.',
  setTimer: 'Időzítő – {machine}',
  minutes: '{n} perc',
  start: 'Indítás',
  stop: 'Leállítás',
  add1: '+1 perc',
  add5: '+5 perc',
  hoursUnit: 'óra',
  minutesUnit: 'perc',
  finishesAt: 'Kész: {time}',
  finished: 'Kész!',
  keyTime: 'Kulcsidő',
  noKey: 'Nincs nálad kulcs.',

  // Push notifications
  pushCardTitle: 'Kapcsold be az értesítéseket',
  pushCardText: 'Szólunk, ha lejár a kulcsidőd, kész a mosás, vagy felszabadul egy kulcs.',
  pushEnable: 'Bekapcsolás',
  pushOn: 'Bekapcsolva ezen az eszközön',
  pushIosTitle: 'Értesítések iPhone-on',
  pushIosText: 'iPhone-on csak akkor kapsz értesítést, ha az oldalt kiteszed a Főképernyőre: Megosztás gomb → „Főképernyőhöz adás”, majd onnan nyisd meg.',
  pushDenied: 'Az értesítések le vannak tiltva. A böngésző beállításaiban engedélyezheted őket ennél az oldalnál.',
  pushUnsupported: 'Ez a böngésző nem támogatja az értesítéseket.',
  pushNeeded: 'Ehhez be kell kapcsolnod az értesítéseket.',
  installTitle: 'Tedd ki a kezdőképernyőre',
  installText: 'Így appként nyílik meg. Androidon: böngésző menü (⋮) → „Hozzáadás a kezdőképernyőhöz”. iPhone-on: Megosztás → „Főképernyőhöz adás”.',
  later: 'Később',

  // Reception page (opened from the printed QR code)
  qrTitle: 'Recepció',
  qrReturnIntro: 'Nálad van a(z) {floor}. emeleti kulcs.',
  qrPickIntro: 'Melyik emelet kulcsát viszed el?',
  qrNoneFree: 'Most minden kulcs foglalt. A kezdőlapon kérhetsz értesítést, ha valamelyik felszabadul.',
  qrInvalid: 'Ez a link nem érvényes. Olvasd be újra a recepción lévő QR-kódot.',
  cameraFailed: 'Nem sikerült elindítani a kamerát. Olvasd be a QR-kódot a telefonod kamerájával – az megnyitja ezt az oldalt.',

  // Account (optional)
  loginTitle: 'Bejelentkezés',
  signupTitle: 'Fiók létrehozása',
  accountIntro: 'Nem kötelező. Fiókkal a neved, a szobaszámod és a kedvenc emeleted bármelyik eszközön megvan, és kulcsfelvételkor nem kell semmit beírnod.',
  loginTab: 'Bejelentkezés',
  signupTab: 'Fiók létrehozása',
  emailLabel: 'E-mail',
  passwordLabel: 'Jelszó',
  passwordPlaceholder: 'legalább 6 karakter',
  loginHoldingKey: 'Ezen az eszközön nálad van egy kulcs. Előbb add vissza, vagy hozz létre fiókot, akkor a kulcs is megmarad.',
  loginButton: 'Bejelentkezés',
  signupButton: 'Fiók létrehozása',
  account: 'Fiók',
  signedInAs: 'Bejelentkezve: {email}',
  logOut: 'Kijelentkezés',
  accountPitch: 'Jelentkezz be, és a neved, a szobaszámod és a kedvenc emeleted minden eszközön megvan.',

  // Favourite floor
  favoriteFloor: 'Kedvenc emelet',
  favoriteIntro: 'A lista tetején mindig látod, szabad-e.',
  none: 'Nincs',
  favLabel: 'Kedvenc emeleted · {floor}.',
  favFree: 'Szabad a kulcs',
  favMine: 'Nálad van a kulcs',
  favTaken: 'Foglalt',
  favOverdue: 'A kulcsidő már lejárt',
  favFreesIn: 'A kulcsidő {time} múlva jár le',

  // Messages
  messages: 'Üzenetek',
  youPrefix: 'Te',
  messagesUnread: 'Üzenetek, {n} olvasatlan',
  message: 'Üzenet',
  messagesNeedKey: 'Üzenetet az küldhet, aki már vett fel kulcsot az oldalon (így mindenki látja, kivel beszél).',
  messagesEmpty: 'Még nincs üzeneted. Egy foglalt emeletnél az „Üzenet” gombbal írhatsz a kulcs gazdájának.',
  messagesNote: 'Az üzenetek 14 nap után törlődnek.',
  chatAboutFloor: 'A(z) {floor}. emeleti kulcs miatt',
  chatEmpty: 'Írj neki, például hogy átvehetnéd-e utána a kulcsot.',
  messagePlaceholder: 'Üzenet…',
  send: 'Küldés',
  seen: 'látta',

  // Settings
  settings: 'Beállítások',
  language: 'Nyelv',
  displayName: 'Név',
  notifications: 'Értesítések',
  rules: 'Szabályok',
  leave: 'Kilépés ezen az eszközön',
  leaveConfirm: 'Ezután újra be kell olvasnod a QR-kódot a recepción, és új felhasználóként csatlakozol. Ha nálad van egy kulcs, előbb add vissza.',
  rulesText: 'Egy kulcs {hours} óráig lehet nálad. Utána minden megkezdett {block} perc {fee}.',

  // Errors from the server
  err_invalid_qr: 'Érvénytelen QR-kód.',
  err_floor_taken: 'Ezt a kulcsot közben már elvitte valaki.',
  err_already_holding_key: 'Már van nálad egy kulcs.',
  err_no_active_key: 'Nincs nálad kulcs.',
  err_not_admin: 'Ehhez nincs jogosultságod.',
  err_not_registered: 'Előbb olvasd be a recepción lévő QR-kódot.',
  err_invalid_name: 'A név 2–60 karakter legyen.',
  err_invalid_room: 'Adj meg egy szobaszámot (pl. 312).',
  err_invalid_login: 'Hibás e-mail-cím vagy jelszó.',
  err_email_taken: 'Ezzel az e-mail-címmel már van fiók. Jelentkezz be.',
  err_weak_password: 'A jelszó legalább 6 karakter legyen.',
  err_confirm_email: 'Erősítsd meg az e-mail-címed a kiküldött levélben, aztán jelentkezz be.',
  err_invalid_email: 'Ez nem érvényes e-mail-cím.',
  err_cannot_message_self: 'Magadnak nem küldhetsz üzenetet.',
  err_unknown_recipient: 'Ennek a felhasználónak nem lehet üzenetet küldeni.',
  err_invalid_message: 'Az üzenet 1–500 karakter legyen.',
  err_too_many_messages: 'Túl sok üzenet egy órán belül. Próbáld kicsit később.',
  err_floor_already_free: 'Ez a kulcs már szabad.',
  err_unknown: 'Hiba történt: {msg}',
};

type Dict = typeof hu;
export type TKey = keyof Dict;

const en: Dict = {
  appName: 'Mosókonyha',
  keys: 'Keys',
  loading: 'Loading…',
  cancel: 'Cancel',
  ok: 'OK',
  save: 'Save',
  back: 'Back',


  joinButton: 'Continue',
  joinTitleFloor: 'Floor {floor} key',
  joinAndPickUp: 'Pick up key',

  nameTitle: 'Who are you?',
  nameIntro: 'Only needed the first time. Others see your name and room number while you hold the key – just like in the reception notebook.',
  namePlaceholder: 'Full name',
  roomLabel: 'Room',
  roomPlaceholder: 'e.g. 312',

  myKey: 'Your key',
  floor: 'Floor {floor}',
  free: 'Free',
  taken: 'Taken',
  you: 'you',
  pickUpKey: 'Pick up key',
  openRoom: 'Laundry room',
  returnKey: 'Return key',
  returnShort: 'Return',
  since: 'picked up {time}',
  remaining: '{time} left',
  overdueBy: 'Overdue: {time}',
  toPay: 'To pay: {fee}',
  notifyMe: 'Notify me when free',
  notifying: "We'll notify you",
  forceReturn: 'Free this key',
  forceReturnConfirm: 'Free the key of floor {floor} ({name})?',
  holdingOther: 'You can only hold one key at a time.',
  freeCount: '{n} keys free',
  freeOf: '{n} of {total} keys free',
  floorWord: 'floor',
  yours: 'Yours',
  machinesSummary: '{n} washers · 1 dryer',
  machinesSummary1: '1 washer · 1 dryer',
  toPayLabel: 'To pay',
  timer: 'Timer',
  noneFree: 'All keys are taken right now',

  scanPickupTitle: 'Pick up key – floor {floor}',
  scanReturnTitle: 'Return key',
  scanHint: 'Scan the QR code at the reception.',
  cameraNeeded: 'Camera access is needed to scan the QR code.',
  allowCamera: 'Allow camera',
  wrongQr: "That's not the laundry QR code.",
  processing: 'Processing…',

  keyReturned: 'You returned the floor {floor} key',
  returnedOnTime: 'Returned on time, nothing to pay. Thanks!',
  returnedWithFee: 'Overtime: {min} min. To pay at the reception: {fee}.',

  roomTitle: 'Floor {floor} laundry room',
  washer: 'Washer {n}',
  dryer: 'Dryer',
  idle: 'Not running',
  tapToStart: 'Tap a machine to set a timer.',
  setTimer: 'Timer – {machine}',
  minutes: '{n} min',
  start: 'Start',
  stop: 'Stop',
  add1: '+1 min',
  add5: '+5 min',
  hoursUnit: 'h',
  minutesUnit: 'min',
  finishesAt: 'Done at {time}',
  finished: 'Done!',
  keyTime: 'Key time',
  noKey: "You don't have a key.",


  pushCardTitle: 'Turn on notifications',
  pushCardText: "We'll tell you when your key time is up, your laundry is done, or a key becomes free.",
  pushEnable: 'Turn on',
  pushOn: 'On for this device',
  pushIosTitle: 'Notifications on iPhone',
  pushIosText: 'On iPhone, notifications only work after you add this page to your Home Screen: Share button → "Add to Home Screen", then open it from there.',
  pushDenied: 'Notifications are blocked. You can allow them for this site in your browser settings.',
  pushUnsupported: "This browser doesn't support notifications.",
  pushNeeded: 'You need to turn on notifications for this.',
  installTitle: 'Add to your home screen',
  installText: 'It then opens like an app. Android: browser menu (⋮) → "Add to Home screen". iPhone: Share → "Add to Home Screen".',
  later: 'Later',

  qrTitle: 'Reception',
  qrReturnIntro: 'You have the key of floor {floor}.',
  qrPickIntro: 'Which floor key are you taking?',
  qrNoneFree: 'All keys are taken right now. On the main page you can ask to be notified when one is free.',
  qrInvalid: 'This link is not valid. Scan the QR code at the reception again.',
  cameraFailed: "Couldn't start the camera. Scan the QR code with your phone's camera instead – it opens this page.",

  loginTitle: 'Log in',
  signupTitle: 'Create account',
  accountIntro: 'Optional. With an account, your name, room number and favourite floor are kept on any device, and you type nothing when picking up a key.',
  loginTab: 'Log in',
  signupTab: 'Create account',
  emailLabel: 'E-mail',
  passwordLabel: 'Password',
  passwordPlaceholder: 'at least 6 characters',
  loginHoldingKey: 'You hold a key on this device. Return it first, or create an account instead, which keeps the key.',
  loginButton: 'Log in',
  signupButton: 'Create account',
  account: 'Account',
  signedInAs: 'Logged in as {email}',
  logOut: 'Log out',
  accountPitch: 'Log in to keep your name, room number and favourite floor on every device.',

  favoriteFloor: 'Favourite floor',
  favoriteIntro: 'The top of the list always shows whether it is free.',
  none: 'None',
  favLabel: 'Your favourite floor · {floor}',
  favFree: 'Key is free',
  favMine: 'You have the key',
  favTaken: 'Taken',
  favOverdue: 'Key time already over',
  favFreesIn: 'Key time ends in {time}',

  messages: 'Messages',
  youPrefix: 'You',
  messagesUnread: 'Messages, {n} unread',
  message: 'Message',
  messagesNeedKey: 'People who have picked up a key on the page can send messages (so everyone sees who they are talking to).',
  messagesEmpty: 'No messages yet. On a taken floor, use the "Message" button to write to whoever has the key.',
  messagesNote: 'Messages are deleted after 14 days.',
  chatAboutFloor: 'About the floor {floor} key',
  chatEmpty: 'Write to them, for example to ask if you could take the key after them.',
  messagePlaceholder: 'Message…',
  send: 'Send',
  seen: 'seen',

  settings: 'Settings',
  language: 'Language',
  displayName: 'Name',
  notifications: 'Notifications',
  rules: 'Rules',
  leave: 'Leave on this device',
  leaveConfirm: "You'll have to scan the QR code at the reception again, and you'll join as a new person. If you hold a key, return it first.",
  rulesText: 'You may keep a key for {hours} hours. After that, every started {block} minutes costs {fee}.',

  err_invalid_qr: 'Invalid QR code.',
  err_floor_taken: 'Someone took this key in the meantime.',
  err_already_holding_key: 'You already hold a key.',
  err_no_active_key: "You don't hold a key.",
  err_not_admin: "You're not allowed to do this.",
  err_not_registered: 'Scan the QR code at the reception first.',
  err_invalid_name: 'The name must be 2–60 characters.',
  err_invalid_room: 'Enter a room number (e.g. 312).',
  err_invalid_login: 'Wrong e-mail or password.',
  err_email_taken: 'There is already an account with this e-mail. Log in instead.',
  err_weak_password: 'The password must be at least 6 characters.',
  err_confirm_email: 'Confirm your e-mail address with the link we sent, then log in.',
  err_invalid_email: 'That is not a valid e-mail address.',
  err_cannot_message_self: 'You cannot message yourself.',
  err_unknown_recipient: 'This person cannot receive messages.',
  err_invalid_message: 'A message must be 1–500 characters.',
  err_too_many_messages: 'Too many messages within an hour. Try again a bit later.',
  err_floor_already_free: 'This key is already free.',
  err_unknown: 'Something went wrong: {msg}',
};

export type Lang = 'hu' | 'en';
const dicts: Record<Lang, Dict> = { hu, en };
const STORAGE_KEY = 'lang';

export type T = (key: TKey, params?: Record<string, string | number>) => string;

function translate(lang: Lang): T {
  return (key, params) => {
    let s = dicts[lang][key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

/** Message for an error code raised by the database. */
export function errorText(t: T, code: string): string {
  const key = `err_${code}` as TKey;
  return key in hu ? t(key) : t('err_unknown', { msg: code });
}

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: T };
const I18nContext = createContext<I18n>({ lang: 'hu', setLang: () => {}, t: translate('hu') });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('hu');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'hu' || v === 'en') setLangState(v);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: translate(lang) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
