import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const hu = {
  appName: 'Mosókonyha',
  loading: 'Betöltés…',
  cancel: 'Mégse',
  ok: 'OK',
  save: 'Mentés',
  back: 'Vissza',

  // Login
  loginTitle: 'Bejelentkezés',
  loginIntro: 'Add meg a BME-s e-mail-címed (@edu.bme.hu). Küldünk rá egy belépőkódot.',
  emailPlaceholder: 'neptun@edu.bme.hu',
  sendCode: 'Kód küldése',
  codeSentTo: 'Elküldtük a kódot ide: {email}',
  codePlaceholder: '6 jegyű kód',
  verify: 'Belépés',
  otherEmail: 'Másik e-mail-cím',
  onlyBme: 'Csak @edu.bme.hu e-mail-címmel lehet belépni.',
  loginFailed: 'Nem sikerült: {msg}',

  // Name
  nameTitle: 'Hogy hívnak?',
  nameIntro: 'Ez a név jelenik meg a többieknek, amíg nálad van egy kulcs (mint a recepciós füzetben).',
  namePlaceholder: 'Teljes név',

  // Home
  myKey: 'Nálad lévő kulcs',
  floor: '{floor}. emelet',
  free: 'Szabad',
  taken: 'Foglalt',
  you: 'te',
  pickUpKey: 'Kulcs felvétele',
  openRoom: 'Mosókonyha',
  returnKey: 'Kulcs visszaadása',
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
  noneFree: 'Most minden kulcs foglalt',

  // Scan
  scanPickupTitle: 'Kulcs felvétele – {floor}. emelet',
  scanReturnTitle: 'Kulcs visszaadása',
  scanHint: 'Olvasd be a recepción kihelyezett QR-kódot.',
  cameraNeeded: 'A QR-kód beolvasásához kamera-hozzáférés kell.',
  allowCamera: 'Kamera engedélyezése',
  wrongQr: 'Ez nem a mosókonyha QR-kódja.',
  processing: 'Feldolgozás…',

  // Proof
  proofPickup: 'Kulcs felvéve',
  proofReturn: 'Kulcs visszaadva',
  proofShow: 'Mutasd meg ezt a képernyőt a recepciósnak!',
  proofLive: 'Élő képernyő – nem képernyőkép',
  proofPickedAt: 'Felvéve: {time}',
  proofReturnedAt: 'Visszaadva: {time}',
  proofDue: 'Vissza kell hozni: {time}',
  proofOvertime: 'Túllépés: {min} perc',
  proofFee: 'Fizetendő: {fee}',
  proofNoFee: 'Nincs fizetendő díj',
  done: 'Kész',

  // Room
  roomTitle: '{floor}. emeleti mosókonyha',
  washer: '{n}. mosógép',
  dryer: 'Szárítógép',
  idle: 'Nem fut',
  tapToStart: 'Koppints az időzítő indításához',
  setTimer: 'Időzítő – {machine}',
  minutes: '{n} perc',
  start: 'Indítás',
  stop: 'Leállítás',
  add5: '+5 perc',
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
  qrTakenBy: 'Foglalt – {name}',
  qrInvalid: 'Ez a link nem érvényes. Olvasd be újra a recepción lévő QR-kódot.',
  cameraFailed: 'Nem sikerült elindítani a kamerát. Olvasd be a QR-kódot a telefonod kamerájával – az megnyitja ezt az oldalt.',

  // Settings
  settings: 'Beállítások',
  language: 'Nyelv',
  displayName: 'Megjelenített név',
  signedInAs: 'Bejelentkezve: {email}',
  signOut: 'Kijelentkezés',
  notifications: 'Értesítések',
  rules: 'Szabályok',
  rulesText: 'Egy kulcs {hours} óráig lehet nálad. Utána minden megkezdett {block} perc {fee}.',

  // Errors from the server
  err_invalid_qr: 'Érvénytelen QR-kód.',
  err_floor_taken: 'Ezt a kulcsot közben már elvitte valaki.',
  err_already_holding_key: 'Már van nálad egy kulcs.',
  err_no_active_key: 'Nincs nálad kulcs.',
  err_no_display_name: 'Előbb add meg a neved.',
  err_not_admin: 'Ehhez nincs jogosultságod.',
  err_floor_already_free: 'Ez a kulcs már szabad.',
  err_email_domain_not_allowed: 'Csak @edu.bme.hu e-mail-címmel lehet belépni.',
  err_unknown: 'Hiba történt: {msg}',
};

type Dict = typeof hu;
export type TKey = keyof Dict;

const en: Dict = {
  appName: 'Mosókonyha',
  loading: 'Loading…',
  cancel: 'Cancel',
  ok: 'OK',
  save: 'Save',
  back: 'Back',

  loginTitle: 'Sign in',
  loginIntro: 'Enter your BME e-mail address (@edu.bme.hu). We will send you a login code.',
  emailPlaceholder: 'neptun@edu.bme.hu',
  sendCode: 'Send code',
  codeSentTo: 'We sent a code to {email}',
  codePlaceholder: '6-digit code',
  verify: 'Sign in',
  otherEmail: 'Use another e-mail',
  onlyBme: 'Only @edu.bme.hu e-mail addresses can sign in.',
  loginFailed: 'Failed: {msg}',

  nameTitle: "What's your name?",
  nameIntro: 'Others will see this name while you hold a key (just like in the reception notebook).',
  namePlaceholder: 'Full name',

  myKey: 'Your key',
  floor: 'Floor {floor}',
  free: 'Free',
  taken: 'Taken',
  you: 'you',
  pickUpKey: 'Pick up key',
  openRoom: 'Laundry room',
  returnKey: 'Return key',
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
  noneFree: 'All keys are taken right now',

  scanPickupTitle: 'Pick up key – floor {floor}',
  scanReturnTitle: 'Return key',
  scanHint: 'Scan the QR code at the reception.',
  cameraNeeded: 'Camera access is needed to scan the QR code.',
  allowCamera: 'Allow camera',
  wrongQr: "That's not the laundry QR code.",
  processing: 'Processing…',

  proofPickup: 'Key picked up',
  proofReturn: 'Key returned',
  proofShow: 'Show this screen to the receptionist!',
  proofLive: 'Live screen – not a screenshot',
  proofPickedAt: 'Picked up: {time}',
  proofReturnedAt: 'Returned: {time}',
  proofDue: 'Due back: {time}',
  proofOvertime: 'Overtime: {min} min',
  proofFee: 'To pay: {fee}',
  proofNoFee: 'Nothing to pay',
  done: 'Done',

  roomTitle: 'Floor {floor} laundry room',
  washer: 'Washer {n}',
  dryer: 'Dryer',
  idle: 'Not running',
  tapToStart: 'Tap to start a timer',
  setTimer: 'Timer – {machine}',
  minutes: '{n} min',
  start: 'Start',
  stop: 'Stop',
  add5: '+5 min',
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
  qrTakenBy: 'Taken – {name}',
  qrInvalid: 'This link is not valid. Scan the QR code at the reception again.',
  cameraFailed: "Couldn't start the camera. Scan the QR code with your phone's camera instead – it opens this page.",

  settings: 'Settings',
  language: 'Language',
  displayName: 'Display name',
  signedInAs: 'Signed in as {email}',
  signOut: 'Sign out',
  notifications: 'Notifications',
  rules: 'Rules',
  rulesText: 'You may keep a key for {hours} hours. After that, every started {block} minutes costs {fee}.',

  err_invalid_qr: 'Invalid QR code.',
  err_floor_taken: 'Someone took this key in the meantime.',
  err_already_holding_key: 'You already hold a key.',
  err_no_active_key: "You don't hold a key.",
  err_no_display_name: 'Set your name first.',
  err_not_admin: "You're not allowed to do this.",
  err_floor_already_free: 'This key is already free.',
  err_email_domain_not_allowed: 'Only @edu.bme.hu e-mail addresses can sign in.',
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
