// ذخیره‌سازی کاملاً محلی روی همین دستگاه
import { useSyncExternalStore } from "react";
import { calcEarly, calcLate, penaltyFor, toMin, type PenaltyUnit, type Rules } from "./penalty";
import { makeKey, parseKey, todayKey, weekdayIdx } from "./jalali";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  rank: string;
  photo?: string | undefined;
  active: boolean;
}
export type Status = "present" | "absent" | "leave" | "mission";
export const STATUS_NAMES: Record<Status, string> = { present: "حاضر", absent: "غایب", leave: "مرخصی", mission: "ماموریت" };

export interface AttRecord {
  id: string;
  employeeId: string;
  date: string;
  status: Status;
  inTime?: string | undefined;
  outTime?: string | undefined;
  stdStart: string;
  stdEnd: string;
  graceIn: number;
  graceOut: number;
  workday: boolean;
  lateMin: number;
  earlyMin: number;
  latePenalty: number;
  earlyPenalty: number;
  lateLabel: string;
  earlyLabel: string;
  unit: PenaltyUnit;
  forgiven: boolean;
  forgiveReason?: string | undefined;
}
export interface DaySched {
  workday: boolean;
  start: string;
  end: string;
}
export interface DB {
  employees: Employee[];
  records: AttRecord[];
  holidays: string[];
  schedule: { days: DaySched[]; graceIn: number; graceOut: number };
  rules: Rules;
  pin: string | null;
}

export const defaultDB = (): DB => ({
  employees: [],
  records: [],
  holidays: [],
  schedule: {
    days: [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      workday: i !== 6,
      start: "07:00",
      end: i === 5 ? "12:00" : "14:00",
    })),
    graceIn: 5,
    graceOut: 5,
  },
  rules: {
    mode: "tiered",
    unit: "points",
    fixed: 1,
    perMinute: 1,
    tiers: [
      { upTo: 15, label: "تذکر شفاهی", amount: 1 },
      { upTo: 30, label: "تذکر کتبی", amount: 2 },
      { upTo: null, label: "کسر ساعت کاری", amount: 3 },
    ],
  },
  pin: null,
});

const KEY = "taradod-db-v1";
const SERVER = defaultDB();
let state: DB = SERVER;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const s = localStorage.getItem(KEY);
    if (s) state = { ...defaultDB(), ...JSON.parse(s) };
    else {
      state = sampleDB();
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    /* داده‌ی خراب نادیده گرفته می‌شود */
  }
}
export function getDB() {
  load();
  return state;
}
function setDB(next: DB) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}
const update = (fn: (d: DB) => DB) => setDB(fn(getDB()));
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useDB = () => useSyncExternalStore(sub, getDB, () => SERVER);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const fullName = (e?: Employee) => (e ? `${e.firstName} ${e.lastName}` : "—");

// ---------- کارکنان ----------
export function saveEmployee(e: Omit<Employee, "id"> & { id?: string | undefined }): string | null {
  if (!e.firstName.trim() || !e.lastName.trim()) return "نام و نام خانوادگی الزامی است.";
  const db = getDB();
  if (e.code.trim() && db.employees.some((x) => x.code === e.code.trim() && x.id !== e.id))
    return "این شماره پرسنلی قبلاً ثبت شده است.";
  const emp = { ...e, code: e.code.trim(), id: e.id ?? uid() } as Employee;
  update((d) => ({
    ...d,
    employees: e.id ? d.employees.map((x) => (x.id === e.id ? emp : x)) : [...d.employees, emp],
  }));
  return null;
}
export const deleteEmployee = (id: string) =>
  update((d) => ({ ...d, employees: d.employees.filter((e) => e.id !== id), records: d.records.filter((r) => r.employeeId !== id) }));

// ---------- تردد ----------
export interface RecordInput {
  id?: string | undefined;
  employeeId: string;
  date: string;
  status: Status;
  inTime?: string | undefined;
  outTime?: string | undefined;
}

/** محاسبه‌ی خالص رکورد؛ ساعت استاندارد از رکورد قبلی (در صورت ویرایش) حفظ می‌شود */
export function computeRecord(input: RecordInput, db: DB, prev?: AttRecord): AttRecord {
  const day = db.schedule.days[weekdayIdx(input.date)] ?? { workday: false, start: "07:00", end: "14:00" };
  const std = prev
    ? { stdStart: prev.stdStart, stdEnd: prev.stdEnd, graceIn: prev.graceIn, graceOut: prev.graceOut, workday: prev.workday }
    : { stdStart: day.start, stdEnd: day.end, graceIn: db.schedule.graceIn, graceOut: db.schedule.graceOut, workday: day.workday };
  const noPenalty = !std.workday || db.holidays.includes(input.date) || input.status !== "present";
  const lateMin = !noPenalty && input.inTime ? calcLate(input.inTime, std.stdStart, std.graceIn) : 0;
  const earlyMin = !noPenalty && input.outTime ? calcEarly(input.outTime, std.stdEnd, std.graceOut) : 0;
  const pl = penaltyFor(lateMin, db.rules);
  const pe = penaltyFor(earlyMin, db.rules);
  return {
    id: input.id ?? uid(),
    employeeId: input.employeeId,
    date: input.date,
    status: input.status,
    inTime: input.status === "present" ? input.inTime : undefined,
    outTime: input.status === "present" ? input.outTime : undefined,
    ...std,
    lateMin,
    earlyMin,
    latePenalty: pl.amount,
    earlyPenalty: pe.amount,
    lateLabel: pl.label,
    earlyLabel: pe.label,
    unit: db.rules.unit,
    forgiven: prev?.forgiven ?? false,
    forgiveReason: prev?.forgiveReason,
  };
}

export function validateRecord(input: RecordInput, db: DB): string | null {
  if (!input.employeeId) return "همکار را انتخاب کنید.";
  if (db.records.some((r) => r.employeeId === input.employeeId && r.date === input.date && r.id !== input.id))
    return "برای این همکار در این تاریخ قبلاً رکورد ثبت شده است.";
  if (input.status === "present") {
    if (!input.inTime && input.outTime) return "ابتدا ساعت ورود را ثبت کنید.";
    if (!input.inTime) return "ساعت ورود را وارد کنید.";
    if (input.outTime && toMin(input.outTime) <= toMin(input.inTime)) return "ساعت خروج نمی‌تواند قبل یا برابر ساعت ورود باشد.";
  }
  return null;
}

export function saveRecord(input: RecordInput): string | null {
  const db = getDB();
  const err = validateRecord(input, db);
  if (err) return err;
  const prev = input.id ? db.records.find((r) => r.id === input.id) : undefined;
  const rec = computeRecord(input, db, prev);
  update((d) => ({ ...d, records: prev ? d.records.map((r) => (r.id === rec.id ? rec : r)) : [...d.records, rec] }));
  return null;
}
export const deleteRecord = (id: string) => update((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));
export const forgiveRecord = (id: string, forgiven: boolean, reason?: string) =>
  update((d) => ({ ...d, records: d.records.map((r) => (r.id === id ? { ...r, forgiven, forgiveReason: forgiven ? reason : undefined } : r)) }));

export function toggleHoliday(date: string) {
  update((d) => {
    const holidays = d.holidays.includes(date) ? d.holidays.filter((h) => h !== date) : [...d.holidays, date];
    const nd = { ...d, holidays };
    return { ...nd, records: d.records.map((r) => (r.date === date ? computeRecord(r, nd, r) : r)) };
  });
}

// ---------- تنظیمات ----------
export const setSchedule = (s: DB["schedule"]) => update((d) => ({ ...d, schedule: s }));
export const setRules = (r: Rules) => update((d) => ({ ...d, rules: r }));
export const setPin = (pin: string | null) => update((d) => ({ ...d, pin }));
export function restoreBackup(json: string): string | null {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data.employees) || !Array.isArray(data.records)) return "فایل پشتیبان معتبر نیست.";
    setDB({ ...defaultDB(), ...data });
    return null;
  } catch {
    return "فایل پشتیبان قابل خواندن نیست.";
  }
}
export const resetAll = () => setDB(defaultDB());

// ---------- آمار ----------
export const penaltyTotal = (r: AttRecord) => (r.forgiven ? 0 : r.latePenalty + r.earlyPenalty);
export const isViolation = (r: AttRecord) => r.lateMin > 0 || r.earlyMin > 0;
export function summarize(records: AttRecord[]) {
  return {
    late: records.reduce((s, r) => s + r.lateMin, 0),
    early: records.reduce((s, r) => s + r.earlyMin, 0),
    violations: records.filter(isViolation).length,
    penalty: records.reduce((s, r) => s + penaltyTotal(r), 0),
    absent: records.filter((r) => r.status === "absent").length,
  };
}
export const inRange = (r: AttRecord, from: string, to: string) => r.date >= from && r.date <= to;

// ---------- داده‌ی نمونه (فرضی) برای اولین اجرا ----------
export function sampleDB(): DB {
  const db = defaultDB();
  const names: [string, string, string][] = [
    ["علی", "محمدی", "کارشناس"], ["زهرا", "احمدی", "حسابدار"], ["رضا", "کریمی", "سرپرست"],
    ["مریم", "حسینی", "منشی"], ["حسین", "رضایی", "تکنسین"], ["فاطمه", "موسوی", "کارشناس"],
  ];
  db.employees = names.map(([firstName, lastName, rank], i) => ({ id: "s" + i, firstName, lastName, rank, code: String(1001 + i), active: true }));
  const { jy, jm, jd } = parseKey(todayKey());
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const t = (base: number, spread: number) => {
    const m = Math.max(0, base + Math.round((rnd() - 0.5) * spread));
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  for (let d = 1; d <= jd; d++) {
    const date = makeKey(jy, jm, d);
    if (!db.schedule.days[weekdayIdx(date)]?.workday) continue;
    for (const e of db.employees) {
      const x = rnd();
      const status: Status = x < 0.06 ? "absent" : x < 0.1 ? "leave" : x < 0.13 ? "mission" : "present";
      const late = rnd() < 0.25;
      const input: RecordInput = status === "present"
        ? { employeeId: e.id, date, status, inTime: t(late ? 435 : 418, late ? 40 : 10), outTime: d === jd ? undefined : t(rnd() < 0.15 ? 815 : 845, 20) }
        : { employeeId: e.id, date, status };
      db.records.push(computeRecord(input, db));
    }
  }
  return db;
}
export const loadSample = () => setDB(sampleDB());
