import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogIn, LogOut, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { JalaliDatePicker, PageHeader } from "@/components/app/shared";
import { RecordDialog } from "@/components/app/records";
import { fa, nowTime, todayKey, weekdayIdx } from "@/lib/jalali";
import { fullName, saveRecord, STATUS_NAMES, toggleHoliday, useDB, type Employee } from "@/lib/store";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "ثبت تردد روزانه | ثبت تردد کارکنان" },
      { name: "description", content: "ثبت سریع ورود و خروج کارکنان برای امروز یا روزهای قبل." },
      { property: "og:title", content: "ثبت تردد روزانه" },
      { property: "og:description", content: "ثبت سریع ورود و خروج کارکنان." },
    ],
  }),
  component: Today,
});

function Today() {
  const db = useDB();
  const [date, setDate] = useState(todayKey());
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ emp: Employee } | null>(null);
  const isToday = date === todayKey();
  const holiday = db.holidays.includes(date);
  const nonWork = !db.schedule.days[weekdayIdx(date)]?.workday;
  const list = db.employees.filter((e) => e.active && (fullName(e) + e.code).includes(q.trim()));

  const quick = (emp: Employee, kind: "in" | "out") => {
    const rec = db.records.find((r) => r.employeeId === emp.id && r.date === date);
    const time = nowTime();
    let err: string | null;
    if (kind === "in") {
      if (rec?.inTime) {
        toast.error("ورود این همکار قبلاً ثبت شده است.");
        return;
      }
      err = saveRecord({ id: rec?.id, employeeId: emp.id, date, status: "present", inTime: time, outTime: rec?.outTime });
    } else {
      if (!rec?.inTime) {
        toast.error("ابتدا ورود این همکار را ثبت کنید.");
        return;
      }
      if (rec.outTime) {
        toast.error("خروج این همکار قبلاً ثبت شده است.");
        return;
      }
      err = saveRecord({ id: rec.id, employeeId: emp.id, date, status: "present", inTime: rec.inTime, outTime: time });
    }
    if (err) toast.error(err);
    else toast.success(`${kind === "in" ? "ورود" : "خروج"} ${fullName(emp)} ساعت ${fa(time)} ثبت شد`);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="ثبت تردد" subtitle={isToday ? "ساعت فعلی گوشی ثبت می‌شود" : "ثبت برای روز گذشته — ساعت را از «بیشتر» وارد کنید"} />
      <JalaliDatePicker value={date} onChange={setDate} />
      <div className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm">
        <span>{nonWork ? "روز غیرکاری طبق برنامه" : holiday ? "این روز تعطیل علامت خورده" : "روز کاری"}</span>
        {!nonWork && (
          <Button size="sm" variant="outline" onClick={() => toggleHoliday(date)}>{holiday ? "لغو تعطیلی" : "علامت تعطیل"}</Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute top-3 right-3 size-4 text-muted-foreground" />
        <Input className="h-11 pr-9" placeholder="جستجوی نام یا کد" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          همکاری یافت نشد. <Link to="/employees" className="text-primary underline">افزودن همکار</Link>
        </p>
      )}
      <div className="space-y-2">
        {list.map((e) => {
          const r = db.records.find((x) => x.employeeId === e.id && x.date === date);
          return (
            <div key={e.id} className="surface flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{fullName(e)}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {r ? (
                    r.status === "present" ? (
                      <>
                        <span>ورود {r.inTime ? fa(r.inTime) : "—"}</span>
                        <span>· خروج {r.outTime ? fa(r.outTime) : "—"}</span>
                        {r.lateMin > 0 && <Badge variant="destructive">تأخیر {fa(r.lateMin)}</Badge>}
                        {r.earlyMin > 0 && <Badge variant="destructive">تعجیل {fa(r.earlyMin)}</Badge>}
                      </>
                    ) : (
                      <Badge variant="secondary">{STATUS_NAMES[r.status]}</Badge>
                    )
                  ) : (
                    <span>ثبت نشده</span>
                  )}
                </div>
              </div>
              {isToday && (!r || r.status === "present") && (
                <>
                  <Button size="lg" variant={r?.inTime ? "secondary" : "default"} className="px-3" onClick={() => quick(e, "in")}><LogIn />ورود</Button>
                  <Button size="lg" variant="secondary" className="px-3" onClick={() => quick(e, "out")}><LogOut />خروج</Button>
                </>
              )}
              <Button size="icon" variant="ghost" aria-label="بیشتر" onClick={() => setDialog({ emp: e })}><MoreHorizontal /></Button>
            </div>
          );
        })}
      </div>
      {dialog && (
        <RecordDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          employeeId={dialog.emp.id}
          defaultDate={date}
          record={db.records.find((x) => x.employeeId === dialog.emp.id && x.date === date)}
        />
      )}
    </div>
  );
}
