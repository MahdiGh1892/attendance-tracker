// منطق محاسبه‌ی تأخیر، تعجیل و جریمه
import { fa } from "./jalali";

export type PenaltyUnit = "points" | "minutes" | "warning";
export type PenaltyMode = "fixed" | "perMinute" | "tiered";
export interface Tier {
  upTo: number | null; // حداکثر دقیقه؛ null یعنی «بیشتر از آن»
  label: string;
  amount: number;
}
export interface Rules {
  mode: PenaltyMode;
  unit: PenaltyUnit;
  fixed: number;
  perMinute: number;
  tiers: Tier[];
}

export const UNIT_NAMES: Record<PenaltyUnit, string> = {
  points: "امتیاز منفی",
  minutes: "دقیقه کسر کار",
  warning: "تذکر",
};

export const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

/** تأخیر: اگر ورود بعد از (ساعت ورود + مهلت) باشد، کل دقیقه‌ها از ساعت استاندارد حساب می‌شود */
export function calcLate(inTime: string, start: string, grace: number) {
  const d = toMin(inTime) - toMin(start);
  return d > grace ? d : 0;
}
/** تعجیل: اگر خروج قبل از (ساعت خروج − مهلت) باشد */
export function calcEarly(outTime: string, end: string, grace: number) {
  const d = toMin(end) - toMin(outTime);
  return d > grace ? d : 0;
}

export function penaltyFor(minutes: number, rules: Rules): { amount: number; label: string } {
  if (minutes <= 0) return { amount: 0, label: "" };
  const unit = UNIT_NAMES[rules.unit];
  if (rules.mode === "fixed") return { amount: rules.fixed, label: rules.unit === "warning" ? "تذکر" : `${fa(rules.fixed)} ${unit}` };
  if (rules.mode === "perMinute") {
    const amount = minutes * rules.perMinute;
    return { amount, label: rules.unit === "warning" ? "تذکر" : `${fa(amount)} ${unit}` };
  }
  const tiers = [...rules.tiers].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  const t = tiers.find((x) => x.upTo == null || minutes <= x.upTo) ?? tiers[tiers.length - 1];
  if (!t) return { amount: 0, label: "" };
  return { amount: t.amount, label: t.label };
}
