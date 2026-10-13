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
  noPushToken: 'Az értesítésekhez engedélyezd az értesítéseket a beállításokban.',
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

  // Notifications
  liveKeyTitle: '{floor}. emeleti kulcs',
  liveKeyBody: 'Ennyi időd van még a kulcs visszaadásáig',
  liveMachineBody: '{floor}. emelet – hátralévő idő',
  machineDoneTitle: '{machine} kész!',
  machineDoneBody: 'Vedd ki a ruhákat a(z) {floor}. emeleten.',
  reminderSoonTitle: 'Hamarosan lejár a kulcsidőd',
  reminderSoonBody: '15 perc múlva vissza kell vinned a(z) {floor}. emeleti kulcsot.',
  reminderOverTitle: 'Lejárt a kulcsidőd',
  reminderOverBody: 'Vidd vissza a kulcsot! Minden megkezdett 30 perc {fee}.',
  channelReminders: 'Emlékeztetők',
  channelKeyFree: 'Szabad kulcs',

  // Settings
  settings: 'Beállítások',
  language: 'Nyelv',
  displayName: 'Megjelenített név',
  signedInAs: 'Bejelentkezve: {email}',
  signOut: 'Kijelentkezés',
  notifications: 'Értesítések',
  notificationsOn: 'Bekapcsolva',
  notificationsOff: 'Kikapcsolva – koppints az engedélyezéshez',
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
  noPushToken: 'Enable notifications in Settings to get notified.',
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

  liveKeyTitle: 'Floor {floor} key',
  liveKeyBody: 'Time left until you must return the key',
  liveMachineBody: 'Floor {floor} – time left',
  machineDoneTitle: '{machine} finished!',
  machineDoneBody: 'Take your laundry out on floor {floor}.',
  reminderSoonTitle: 'Your key time is almost up',
  reminderSoonBody: 'Return the floor {floor} key in 15 minutes.',
  reminderOverTitle: 'Your key time is up',
  reminderOverBody: 'Please return the key! Every started 30 minutes costs {fee}.',
  channelReminders: 'Reminders',
  channelKeyFree: 'Key available',

  settings: 'Settings',
  language: 'Language',
  displayName: 'Display name',
  signedInAs: 'Signed in as {email}',
  signOut: 'Sign out',
  notifications: 'Notifications',
  notificationsOn: 'On',
  notificationsOff: 'Off – tap to enable',
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
