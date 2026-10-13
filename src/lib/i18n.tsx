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
  welcomeIntro: 'Nézd meg, melyik emelet mosókonyha-kulcsa szabad. A kezdéshez olvasd be a recepción kihelyezett QR-kódot.',
  welcomeScan: 'QR-kód beolvasása',
  welcomeCameraTip: 'A telefonod kamera-appjával is beolvashatod – az megnyitja ezt az oldalt.',
  joinButton: 'Kezdés',
  nameTitle: 'Ki vagy?',
  nameIntro: 'A neved és a szobaszámod látják a többiek, amíg nálad van egy kulcs – mint a recepciós füzetben.',
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
  qrTakenBy: 'Foglalt – {name}',
  qrInvalid: 'Ez a link nem érvényes. Olvasd be újra a recepción lévő QR-kódot.',
  cameraFailed: 'Nem sikerült elindítani a kamerát. Olvasd be a QR-kódot a telefonod kamerájával – az megnyitja ezt az oldalt.',

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


  welcomeIntro: "See which floor's laundry key is free. To start, scan the QR code at the reception.",
  welcomeScan: 'Scan QR code',
  welcomeCameraTip: "You can also scan it with your phone's camera app – it opens this page.",
  joinButton: 'Start',

  nameTitle: 'Who are you?',
  nameIntro: 'Others see your name and room number while you hold a key – just like in the reception notebook.',
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
  qrTakenBy: 'Taken – {name}',
  qrInvalid: 'This link is not valid. Scan the QR code at the reception again.',
  cameraFailed: "Couldn't start the camera. Scan the QR code with your phone's camera instead – it opens this page.",

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
