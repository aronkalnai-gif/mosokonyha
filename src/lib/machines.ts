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

/** Content of the printed QR code at the reception: "MOSOKONYHA:<secret>". */
export function parseReceptionQr(data: string): string | null {
  const m = /^MOSOKONYHA:([0-9a-f]{16,})$/i.exec(data.trim());
  return m ? m[1] : null;
}
