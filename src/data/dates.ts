// Kuupäevade tuletamine vabatekstist (intakeText) ja eestikeelne vormindus.
// Konservatiivne: ainult selge "kuni DD.MM.YYYY" / "algab DD.MM.YYYY" → muidu null.

const ET_MONTHS = [
  "jaanuar", "veebruar", "märts", "aprill", "mai", "juuni",
  "juuli", "august", "september", "oktoober", "november", "detsember"
];

function toIso(d: string, m: string, y: string): string | null {
  const dd = Number(d), mm = Number(m), yy = Number(y);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 2024 || yy > 2100) return null;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function parseIntakeDates(intakeText?: string | null): {
  registrationDeadline: string | null;
  startDate: string | null;
} {
  if (!intakeText) return { registrationDeadline: null, startDate: null };
  const dl = intakeText.match(/kuni\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  const st = intakeText.match(/alga\w*\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  return {
    registrationDeadline: dl ? toIso(dl[1], dl[2], dl[3]) : null,
    startDate: st ? toIso(st[1], st[2], st[3]) : null
  };
}

/** ISO YYYY-MM-DD → "21.08.2026" */
export function formatEt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** ISO → "2026-08" (kuu-võti grupeerimiseks) */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** ISO → "August 2026" */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const name = ET_MONTHS[Number(m) - 1] ?? m;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}
