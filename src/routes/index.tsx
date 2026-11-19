import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/app/shared";
import { fa, longDate, makeKey, monthLength, MONTHS, parseKey, rangeFor, todayKey } from "@/lib/jalali";
import { fullName, inRange, loadSample, isViolation, penaltyTotal, summarize, useDB } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "داشبورد | ثبت تردد کارکنان" },
      { name: "description", content: "وضعیت حضور امروز و تخلفات ماه جاری کارکنان." },
      { property: "og:title", content: "داشبورد ثبت تردد کارکنان" },
      { property: "og:description", content: "وضعیت حضور امروز و تخلفات ماه جاری کارکنان." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const today = todayKey();
  const active = db.employees.filter((e) => e.active);
  const todays = db.records.filter((r) => r.date === today);
  const present = todays.filter((r) => r.status === "present");
  const late = todays.filter((r) => r.lateMin > 0);
  const absent = todays.filter((r) => r.status === "absent").length;
  const unrecorded = active.filter((e) => !todays.some((r) => r.employeeId === e.id)).length;

  const { jy, jm, jd } = parseKey(today);
  const [from, to] = rangeFor("month", today);
  const monthRecs = db.records.filter((r) => inRange(r, from, to));
  const len = monthLength(jy, jm);
  const ms = summarize(monthRecs);
  const perDay = Array.from({ length: len }, (_, i) => {
    const rs = monthRecs.filter((r) => r.date === makeKey(jy, jm, i + 1) && isViolation(r));
    return { late: rs.filter((r) => r.lateMin > 0).length, early: rs.filter((r) => r.earlyMin > 0).length };
  });
  const max = Math.max(1, ...perDay.map((d) => d.late + d.early));

  const ranking = active
    .map((e) => ({ e, p: monthRecs.filter((r) => r.employeeId === e.id).reduce((s, r) => s + penaltyTotal(r), 0) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, 5);

  return (
    <div className="space-y-5 animate-in fade-in">
      <section className="hero-bg rounded-2xl p-5">
        <div className="text-sm opacity-80">امروز</div>
        <div className="mt-1 text-xl font-bold">{longDate(today)}</div>
        <Button asChild size="lg" className="mt-4 w-full">
          <Link to="/today">ثبت تردد امروز</Link>
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="حاضرین" value={present.length} tone="success" />
        <Stat label="متأخرین" value={late.length} tone="warning" />
        <Stat label="غایبین" value={absent} tone="danger" />
        <Stat label="ثبت‌نشده" value={unrecorded} />
      </div>

      <section className="surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">تخلفات {MONTHS[jm - 1] ?? ""}</h2>
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            {fa(ms.violations)} تخلف در ماه
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-warning/10 p-2 text-center">
            <div className="text-base font-bold text-warning-foreground">{fa(ms.late)}</div>
            <div className="text-[10px] text-muted-foreground">دقیقه تأخیر</div>
          </div>
          <div className="rounded-xl bg-destructive/10 p-2 text-center">
            <div className="text-base font-bold text-destructive">{fa(ms.early)}</div>
            <div className="text-[10px] text-muted-foreground">دقیقه تعجیل</div>
          </div>
          <div className="rounded-xl bg-primary/10 p-2 text-center">
            <div className="text-base font-bold text-primary">{fa(ms.penalty)}</div>
            <div className="text-[10px] text-muted-foreground">جریمه کل</div>
          </div>
        </div>

        <div className="relative mt-4 h-32">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-t border-dashed border-border/70" />
            ))}
          </div>
          <div className="relative flex h-full items-end gap-[3px]">
            {perDay.map((d, i) => {
              const tot = d.late + d.early;
              const lateShare = tot ? (d.late / tot) * 100 : 0;
              const parts = [
                d.late ? `${fa(d.late)} تأخیر` : "",
                d.early ? `${fa(d.early)} تعجیل` : "",
              ].filter(Boolean).join(" · ");
              return (
                <div key={i} className="flex h-full flex-1 flex-col justify-end" title={tot ? `روز ${fa(i + 1)}: ${parts}` : `روز ${fa(i + 1)}: بدون تخلف`}>
                  {tot > 0 ? (
                    <div className="w-full overflow-hidden rounded-md shadow-sm" style={{ height: `${Math.max((tot / max) * 100, 5)}%` }}>
                      <div className="w-full bg-gradient-to-t from-destructive/85 to-destructive/60" style={{ height: `${100 - lateShare}%` }} />
                      <div className="w-full bg-gradient-to-t from-warning to-warning/75" style={{ height: `${lateShare}%` }} />
                    </div>
                  ) : (
                    <div className="mx-auto h-1 w-1/2 rounded-full bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-1.5 flex gap-[3px] text-[10px] text-muted-foreground">
          {perDay.map((_, i) => (
            <span key={i} className={`flex-1 text-center ${i + 1 === jd ? "font-bold text-primary" : ""}`}>
              {(i + 1) % 5 === 1 || i + 1 === len || i + 1 === jd ? fa(i + 1) : ""}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning" /> تأخیر</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destructive" /> تعجیل در خروج</span>
        </div>
      </section>

      {ranking.length > 0 && (
        <section className="surface p-4">
          <h2 className="mb-2 font-semibold">بیشترین جریمه در این ماه</h2>
          {ranking.map(({ e, p }) => (
            <Link key={e.id} to="/employees/$id" params={{ id: e.id }} className="flex justify-between border-b py-2 last:border-0">
              <span>{fullName(e)}</span><span className="font-bold text-destructive">{fa(p)}</span>
            </Link>
          ))}
        </section>
      )}

      {db.employees.length === 0 && (
        <div className="surface p-5 text-center">
          <p className="text-muted-foreground">هنوز همکاری ثبت نشده است.</p>
          <div className="mt-3 flex justify-center gap-2"><Button asChild><Link to="/employees">افزودن کارکنان</Link></Button><Button variant="secondary" onClick={loadSample}>بارگذاری داده نمونه</Button></div>
        </div>
      )}
    </div>
  );
}
