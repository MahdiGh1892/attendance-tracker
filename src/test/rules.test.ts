import { describe, expect, it } from "vitest";
import { dateToKey, isLeapJ, monthLength, weekdayIdx, toGregorian, rangeFor } from "@/lib/jalali";
import { calcEarly, calcLate, penaltyFor, type Rules } from "@/lib/penalty";
import { computeRecord, defaultDB, validateRecord } from "@/lib/store";

describe("تقویم شمسی", () => {
  it("۲۵ اکتبر ۲۰۲۶ = یکشنبه ۱۴۰۵/۰۸/۰۳", () => {
    const k = dateToKey(new Date(2026, 9, 25));
    expect(k).toBe("1405-08-03");
    expect(weekdayIdx(k)).toBe(1);
  });
  it("نوروز ۱۴۰۴ = ۲۱ مارس ۲۰۲۵", () => {
    const g = toGregorian(1404, 1, 1);
    expect([g.getFullYear(), g.getMonth() + 1, g.getDate()]).toEqual([2025, 3, 21]);
  });
  it("سال کبیسه", () => {
    expect(isLeapJ(1403)).toBe(true);
    expect(monthLength(1403, 12)).toBe(30);
    expect(monthLength(1404, 12)).toBe(29);
  });
  it("هفته از شنبه شروع می‌شود", () => {
    expect(rangeFor("week", "1405-08-03")).toEqual(["1405-08-02", "1405-08-08"]);
  });
});

describe("تأخیر و تعجیل", () => {
  it("ورود ۰۷:۰۵ با مهلت ۵ دقیقه تأخیر ندارد", () => expect(calcLate("07:05", "07:00", 5)).toBe(0));
  it("ورود ۰۷:۱۲ = ۱۲ دقیقه تأخیر", () => expect(calcLate("07:12", "07:00", 5)).toBe(12));
  it("خروج ۱۳:۳۰ = ۳۰ دقیقه تعجیل", () => expect(calcEarly("13:30", "14:00", 5)).toBe(30));
});

const base: Rules = { mode: "fixed", unit: "points", fixed: 2, perMinute: 1, tiers: [] };
describe("جریمه", () => {
  it("ثابت", () => expect(penaltyFor(12, base).amount).toBe(2));
  it("دقیقه‌ای", () => expect(penaltyFor(12, { ...base, mode: "perMinute" }).amount).toBe(12));
  it("پله‌ای: ۲۰ دقیقه = تذکر کتبی", () => {
    const r = defaultDB().rules;
    expect(penaltyFor(20, r).label).toBe("تذکر کتبی");
    expect(penaltyFor(45, r).label).toBe("کسر ساعت کاری");
  });
  it("مرخصی و روز تعطیل جریمه ندارد", () => {
    const db = defaultDB();
    const leave = computeRecord({ employeeId: "a", date: "1405-08-03", status: "leave" }, db);
    expect(leave.latePenalty).toBe(0);
    const hol = computeRecord({ employeeId: "a", date: "1405-08-03", status: "present", inTime: "08:00" }, { ...db, holidays: ["1405-08-03"] });
    expect(hol.lateMin).toBe(0);
  });
  it("خروج قبل از ورود رد می‌شود", () => {
    expect(validateRecord({ employeeId: "a", date: "1405-08-03", status: "present", inTime: "09:00", outTime: "08:00" }, defaultDB())).not.toBeNull();
  });
});
