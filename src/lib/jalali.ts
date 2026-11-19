// تبدیل دقیق میلادی ↔ شمسی (الگوریتم jalaali) و ابزارهای نمایش فارسی
const PD = "۰۱۲۳۴۵۶۷۸۹";
export const fa = (v: string | number) => String(v).replace(/\d/g, (d) => PD[+d] ?? d);
export const toEn = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(PD.indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0] ?? 0, jump = 0;
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i] ?? 0;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export const isLeapJ = (jy: number) => jalCal(jy).leap === 0;
export const monthLength = (jy: number, jm: number) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJ(jy) ? 30 : 29);

export function toJalali(d: Date) {
  return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}
export function toGregorian(jy: number, jm: number, jd: number) {
  const g = d2g(j2d(jy, jm, jd));
  return new Date(g.gy, g.gm - 1, g.gd);
}

// کلید تاریخ: «۱۴۰۵-۰۸-۰۳» به‌صورت لاتین، قابل مرتب‌سازی
const p2 = (n: number) => String(n).padStart(2, "0");
export const makeKey = (jy: number, jm: number, jd: number) => `${jy}-${p2(jm)}-${p2(jd)}`;
export const parseKey = (k: string) => {
  const [jy = 0, jm = 1, jd = 1] = k.split("-").map(Number);
  return { jy, jm, jd };
};
export const dateToKey = (d: Date) => {
  const j = toJalali(d);
  return makeKey(j.jy, j.jm, j.jd);
};
export const todayKey = () => dateToKey(new Date());
export const keyToDate = (k: string) => {
  const { jy, jm, jd } = parseKey(k);
  return toGregorian(jy, jm, jd);
};
export const addDays = (k: string, n: number) => {
  const d = keyToDate(k);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
};
/** شنبه = ۰ ... جمعه = ۶ */
export const weekdayIdx = (k: string) => (keyToDate(k).getDay() + 1) % 7;
export const shortDate = (k: string) => fa(k.replace(/-/g, "/"));
export const formatKey = (k: string) => `${WEEKDAYS[weekdayIdx(k)] ?? ""} ${shortDate(k)}`;
export const longDate = (k: string) => {
  const { jy, jm, jd } = parseKey(k);
  return `${WEEKDAYS[weekdayIdx(k)] ?? ""} ${fa(jd)} ${MONTHS[jm - 1] ?? ""} ${fa(jy)}`;
};
export const nowTime = () => {
  const d = new Date();
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

export type RangeKind = "day" | "week" | "month" | "year" | "custom";
export function rangeFor(kind: RangeKind, ref = todayKey()): [string, string] {
  const { jy, jm } = parseKey(ref);
  if (kind === "day") return [ref, ref];
  if (kind === "week") {
    const s = addDays(ref, -weekdayIdx(ref));
    return [s, addDays(s, 6)];
  }
  if (kind === "month") return [makeKey(jy, jm, 1), makeKey(jy, jm, monthLength(jy, jm))];
  return [makeKey(jy, 1, 1), makeKey(jy, 12, monthLength(jy, 12))];
}
