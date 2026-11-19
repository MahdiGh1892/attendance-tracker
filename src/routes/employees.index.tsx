import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/shared";
import { EmployeeDialog } from "@/components/app/employee-dialog";
import { fa } from "@/lib/jalali";
import { fullName, summarize, useDB } from "@/lib/store";

export const Route = createFileRoute("/employees/")({
  head: () => ({
    meta: [
      { title: "کارکنان | ثبت تردد کارکنان" },
      { name: "description", content: "فهرست، افزودن و ویرایش کارکنان یگان." },
      { property: "og:title", content: "کارکنان" },
      { property: "og:description", content: "فهرست، افزودن و ویرایش کارکنان یگان." },
    ],
  }),
  component: Employees,
});

function Employees() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("active");
  const [open, setOpen] = useState(false);
  const list = db.employees
    .filter((e) => (filter === "all" ? true : filter === "active" ? e.active : !e.active))
    .filter((e) => (fullName(e) + e.code + e.rank).includes(q.trim()))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "fa"));

  return (
    <div className="space-y-4">
      <PageHeader title="کارکنان" subtitle={`${fa(db.employees.length)} نفر`} action={<Button onClick={() => setOpen(true)}><Plus />افزودن</Button>} />
      <div className="relative">
        <Search className="absolute top-3 right-3 size-4 text-muted-foreground" />
        <Input className="h-11 pr-9" placeholder="جستجوی نام، کد یا سمت" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex gap-1.5">
        {([["active", "فعال"], ["inactive", "غیرفعال"], ["all", "همه"]] as const).map(([k, l]) => (
          <Button key={k} size="sm" className="rounded-full" variant={filter === k ? "default" : "secondary"} onClick={() => setFilter(k)}>{l}</Button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((e) => {
          const s = summarize(db.records.filter((r) => r.employeeId === e.id));
          return (
            <Link key={e.id} to="/employees/$id" params={{ id: e.id }} className="surface flex items-center gap-3 p-3 transition-transform active:scale-[0.99]">
              {e.photo ? (
                <img src={e.photo} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary"><UserRound className="text-muted-foreground" /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{fullName(e)}</div>
                <div className="text-xs text-muted-foreground">{[e.rank, e.code && `کد ${fa(e.code)}`].filter(Boolean).join(" · ")}</div>
              </div>
              {!e.active && <Badge variant="outline">غیرفعال</Badge>}
              {s.violations > 0 && <Badge variant="destructive">{fa(s.violations)} تخلف</Badge>}
            </Link>
          );
        })}
        {list.length === 0 && <p className="py-10 text-center text-muted-foreground">موردی یافت نشد.</p>}
      </div>
      <EmployeeDialog open={open} onOpenChange={setOpen} onSaved={() => toast.success("همکار اضافه شد")} />
    </div>
  );
}
