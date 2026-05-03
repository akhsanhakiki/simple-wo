/** Shift bucketing for invitation times (matches GuestManager defaults). */

export const SHIFT_OPTIONS = [
  { value: "shift1", label: "Shift 1: 10.00 - 11.00", startTime: "10:00" },
  { value: "shift2", label: "Shift 2: 11.00 - 12.30", startTime: "11:00" },
  { value: "shift3", label: "Shift 3: 12.30 - 13.00", startTime: "12:30" },
] as const;

export function getShiftKeyFromTime(iso: string | null): string {
  if (!iso) return SHIFT_OPTIONS[0].value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return SHIFT_OPTIONS[0].value;
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 10 && m === 0) return "shift1";
  if (h === 11 && m === 0) return "shift2";
  if (h === 12 && m === 30) return "shift3";
  return SHIFT_OPTIONS[0].value;
}

export function getShiftLabelFromInvitationTime(iso: string | null): string {
  const key = getShiftKeyFromTime(iso);
  return SHIFT_OPTIONS.find((s) => s.value === key)?.label ?? "—";
}
