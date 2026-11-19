import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, RangePicker, Stat } from "@/components/app/shared";
import { unitName } from "@/components/app/records";
import { fa, formatKey, rangeFor, shortDate } from "@/lib/jalali";
import { fullName, inRange, penaltyTotal, STATUS_NAMES, summarize, useDB } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "گزارش‌ها | ثبت تردد کارکنان" },
      { name: "description", content: "گزارش ماهانه و دلخواه تردد و مجازات با خروجی اکسل و چاپ." },
      { property: "og:title", content: "گزارش‌های تردد" },
      { property: "og:description", content: "گزارش تردد و مجازات با خروجی اکسل و چاپ." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const db = useDB();
  const [range, setRange] = useState<[string, string]>(rangeFor("month"));
  const [emp, setEmp] = useState("");
  const [order, setOrder] = useState<"most" | "least">("most");
  const recs = db.records
    .filter((r) => inRange(r, ...range) && (!emp || r.employeeId === emp))
    .sort((a, b) => a.date.localeCompare(b.date));
  const s = summarize(recs);
  const name = (id: string) => fullName(db.employees.find((e) => e.id === id));

  const ranking = db.employees
    .filter((e) => !emp || e.id === emp)
    .map((e) => ({ e, ...summarize(recs.filter((r) => r.employeeId === e.id)) }))
    .sort((a, b) => (order === "most" ? b.violations - a.violations || b.penalty - a.penalty : a.violations - b.violations || a.penalty - b.penalty));

  const exportCsv = () => {
    const head = ["تاریخ", "نام", "کد", "وضعیت", "ورود", "خروج", "تأخیر (دقیقه)", "تعجیل (دقیقه)", "جریمه", "شرح", "بخشودگی"];
    const rows = recs.map((r) => {
      const e = db.employees.find((x) => x.id === r.employeeId);
      return [shortDate(r.date), fullName(e), e?.code ?? "", STATUS_NAMES[r.status], r.inTime ?? "", r.outTime ?? "", r.lateMin, r.earlyMin, penaltyTotal(r),
        [r.lateLabel, r.earlyLabel].filter(Boolean).join(" / "), r.forgiven ? `بله ${r.forgiveReason ?? ""}` : ""];
    });
    const csv = [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taradod-${range[0]}_${range[1]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="گزارش‌ها" subtitle={`${shortDate(range[0])} تا ${shortDate(range[1])}`} />
      <div className="no-print space-y-3">
        <RangePicker value={range} onChange={setRange} />
        <select className="field" value={emp} onChange={(e) => setEmp(e.target.value)}>
          <option value="">کل واحد</option>
          {db.employees.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={exportCsv}><Download />اکسل (CSV)</Button>
          <Button variant="secondary" size="lg" onClick={() => window.print()}><Printer />چاپ / PDF</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="تعداد تخلف" value={s.violations} tone="danger" />
        <Stat label={`مجموع جریمه (${unitName(db.rules.unit)})`} value={s.penalty} tone="danger" />
        <Stat label="تأخیر (دقیقه)" value={s.late} tone="warning" />
        <Stat label="غیبت" value={s.absent} />
      </div>
      <section className="surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">رتبه‌بندی</h2>
          <div className="no-print flex gap-1">
            <Button size="sm" variant={order === "most" ? "default" : "secondary"} onClick={() => setOrder("most")}>بیشترین</Button>
            <Button size="sm" variant={order === "least" ? "default" : "secondary"} onClick={() => setOrder("least")}>کمترین</Button>
          </div>
        </div>
        {ranking.map((x, i) => (
          <div key={x.e.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
            <span>{fa(i + 1)}. {fullName(x.e)}</span>
            <span className="text-muted-foreground">{fa(x.violations)} تخلف · {fa(x.penalty)} جریمه</span>
          </div>
        ))}
      </section>
      <section className="surface overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b"><th className="p-2 text-start">تاریخ</th><th className="p-2 text-start">نام</th><th className="p-2">ورود</th><th className="p-2">خروج</th><th className="p-2">تأخیر</th><th className="p-2">تعجیل</th><th className="p-2">جریمه</th></tr>
          </thead>
          <tbody>
            {recs.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-2 whitespace-nowrap">{formatKey(r.date)}</td>
                <td className="p-2 whitespace-nowrap">{name(r.employeeId)}</td>
                <td className="p-2 text-center">{r.status === "present" ? fa(r.inTime ?? "—") : STATUS_NAMES[r.status]}</td>
                <td className="p-2 text-center">{fa(r.outTime ?? "—")}</td>
                <td className="p-2 text-center">{r.lateMin ? fa(r.lateMin) : "—"}</td>
                <td className="p-2 text-center">{r.earlyMin ? fa(r.earlyMin) : "—"}</td>
                <td className="p-2 text-center">{r.forgiven ? "بخشوده" : penaltyTotal(r) ? fa(penaltyTotal(r)) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recs.length === 0 && <p className="py-6 text-center text-muted-foreground">در این بازه رکوردی نیست.</p>}
      </section>
    </div>
  );
}
