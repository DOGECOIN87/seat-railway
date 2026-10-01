import { CABIN_ZONES, type CabinSeat } from '../content/cabin';

export const ROWS_PER_COACH = 6;
export const COACH_PITCH = 20.78;
export const RAIL_FLOOR = 1;

export function coachForRow(row: number): number {
  if (row <= 2) return 0;
  if (row <= 7) return 1;
  return 2 + Math.floor((Math.max(8, row) - 8) / ROWS_PER_COACH);
}

export function coachRows(row: number): number[] {
  const coach = coachForRow(row);
  if (coach === 0) return [1, 2];
  if (coach === 1) return [3, 4, 5, 6, 7];
  const start = 8 + (coach - 2) * ROWS_PER_COACH;
  return Array.from({ length: ROWS_PER_COACH }, (_, i) => start + i).filter((n) => n <= 30);
}

export function railRowZ(row: number): number {
  if (row <= 2) return row === 1 ? -4 : 4;
  return -6.5 + coachRows(row).indexOf(row) * 2.6;
}

export function railSeatX(seat: CabinSeat): number {
  const side = seat.bank === 'left' ? -1 : 1;
  if (seat.bankSize === 1) return side * 1.05;
  return side * (seat.position === 'window' ? 1.32 : 0.64);
}

export function zoneForRow(row: number) {
  return CABIN_ZONES.find((zone) => zone.rows.some((r) => r.n === row)) ?? CABIN_ZONES[4];
}
