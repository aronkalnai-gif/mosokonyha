export type MachineKind = 'washer' | 'dryer';
export type Machine = { id: string; kind: MachineKind; number: number };

export const FLOORS = [1, 2, 3, 4, 5, 6] as const;

/** Every floor has two washers and a dryer – except the 4th, which has one of each. */
export function machinesOnFloor(floor: number): Machine[] {
  const washers = floor === 4 ? 1 : 2;
  const list: Machine[] = [];
  for (let i = 1; i <= washers; i++) list.push({ id: `${floor}-w${i}`, kind: 'washer', number: i });
  list.push({ id: `${floor}-d1`, kind: 'dryer', number: 1 });
  return list;
}

const SECRET = /^[0-9a-f]{16,}$/i;

/**
 * The printed QR code at the reception holds a link to this site's /qr page:
 * "https://<site>/qr?c=<secret>". Returns the secret.
 */
export function parseReceptionQr(data: string): string | null {
  const text = data.trim();
  try {
    const c = new URL(text).searchParams.get('c');
    if (c && SECRET.test(c)) return c;
  } catch {
    // not a URL
  }
  const m = /^MOSOKONYHA:(.+)$/i.exec(text);
  return m && SECRET.test(m[1]) ? m[1] : null;
}

export function isValidSecret(code: string | null | undefined): code is string {
  return !!code && SECRET.test(code);
}
