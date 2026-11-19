import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RangePicker, Stat } from "@/components/app/shared";
import { RecordDialog, RecordRow, unitName } from "@/components/app/records";
import { EmployeeDialog } from "@/components/app/employee-dialog";
import { fa, rangeFor } from "@/lib/jalali";
import { deleteEmployee, fullName, inRange, summarize, useDB } from "@/lib/store";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({
    meta: [
      { title: "پرونده‌ی همکار | ثبت تردد کارکنان" },
      { name: "description", content: "سابقه‌ی تردد، تأخیر، تعجیل و مجازات‌های همکار." },
      { property: "og:title", content: "پرونده‌ی همکار" },
      { property: "og:description", content: "سابقه‌ی تردد و مجازات‌های همکار." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const db = useDB();
  const nav = useNavigate();
  const [range, setRange] = useState<[string, string]>(rangeFor("month"));
  const [edit, setEdit] = useState(false);
  const [add, setAdd] = useState(false);
  const emp = db.employees.find((e) => e.id === id);
  if (!emp) return <p className="py-10 text-center text-muted-foreground">همکار یافت نشد. <Link to="/employees" className="text-primary underline">بازگشت</Link></p>;
  const recs = db.records.filter((r) => r.employeeId === id && inRange(r, ...range)).sort((a, b) => b.date.localeCompare(a.date));
  const s = summarize(recs);

  return (
    <div className="space-y-4">
      <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowRight className="size-4" />کارکنان</Link>
      <section className="hero-bg flex items-center gap-4 rounded-2xl p-5">
        {emp.photo && <img src={emp.photo} alt="" className="size-16 rounded-full object-cover" />}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{fullName(emp)}</h1>
          <p className="text-sm opacity-80">{[emp.rank, emp.code && `کد ${fa(emp.code)}`, !emp.active && "غیرفعال"].filter(Boolean).join(" · ")}</p>
        </div>
        <Button size="icon" variant="secondary" aria-label="ویرایش" onClick={() => setEdit(true)}><Pencil /></Button>
      </section>
      <RangePicker value={range} onChange={setRange} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="مجموع تأخیر (دقیقه)" value={s.late} tone="warning" />
        <Stat label="مجموع تعجیل (دقیقه)" value={s.early} tone="warning" />
        <Stat label="تعداد تخلف" value={s.violations} tone="danger" />
        <Stat label={`مجموع جریمه (${unitName(db.rules.unit)})`} value={s.penalty} tone="danger" />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">سوابق ({fa(recs.length)})</h2>
        <Button size="sm" onClick={() => setAdd(true)}><Plus />ثبت دستی</Button>
      </div>
      <div className="space-y-2">
        {recs.map((r) => <RecordRow key={r.id} r={r} />)}
        {recs.length === 0 && <p className="py-6 text-center text-muted-foreground">در این بازه رکوردی نیست.</p>}
      </div>
      <Button
        variant="ghost"
        className="w-full text-destructive"
        onClick={() => {
          if (confirm("همکار و تمام سوابقش حذف شود؟ برای حفظ سوابق، به‌جای حذف او را غیرفعال کنید.")) {
            deleteEmployee(emp.id);
            toast("همکار حذف شد");
            nav({ to: "/employees" });
          }
        }}
      >
        <Trash2 />حذف همکار
      </Button>
      <EmployeeDialog open={edit} onOpenChange={setEdit} employee={emp} onSaved={() => toast.success("ذخیره شد")} />
      <RecordDialog open={add} onOpenChange={setAdd} employeeId={emp.id} />
    </div>
  );
}
