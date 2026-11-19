import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fa, formatKey, todayKey, nowTime } from "@/lib/jalali";
import { UNIT_NAMES } from "@/lib/penalty";
import {
  deleteRecord, forgiveRecord, fullName, saveRecord, STATUS_NAMES, useDB,
  type AttRecord, type Status,
} from "@/lib/store";
import { JalaliDatePicker } from "./shared";

export function RecordDialog({
  open, onOpenChange, employeeId, record, defaultDate,
}: { open: boolean; onOpenChange: (o: boolean) => void; employeeId?: string | undefined; record?: AttRecord | undefined; defaultDate?: string | undefined }) {
  const db = useDB();
  const [emp, setEmp] = useState("");
  const [date, setDate] = useState(todayKey());
  const [status, setStatus] = useState<Status>("present");
  const [inTime, setIn] = useState("");
  const [outTime, setOut] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open) return;
    setErr("");
    setEmp(record?.employeeId ?? employeeId ?? "");
    setDate(record?.date ?? defaultDate ?? todayKey());
    setStatus(record?.status ?? "present");
    setIn(record?.inTime ?? (record ? "" : nowTime()));
    setOut(record?.outTime ?? "");
  }, [open, record, employeeId, defaultDate]);

  const save = () => {
    const e = saveRecord({ id: record?.id, employeeId: emp, date, status, inTime: inTime || undefined, outTime: outTime || undefined });
    if (e) return setErr(e);
    toast.success("رکورد ذخیره شد");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{record ? "ویرایش تردد" : "ثبت تردد"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!employeeId && !record && (
            <label className="block space-y-1">
              <span className="text-sm">همکار</span>
              <select className="field" value={emp} onChange={(e) => setEmp(e.target.value)}>
                <option value="">انتخاب کنید</option>
                {db.employees.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}
              </select>
            </label>
          )}
          <div className="space-y-1"><span className="text-sm">تاریخ</span><JalaliDatePicker value={date} onChange={setDate} /></div>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(STATUS_NAMES) as Status[]).map((s) => (
              <Button key={s} type="button" variant={status === s ? "default" : "secondary"} onClick={() => setStatus(s)}>{STATUS_NAMES[s]}</Button>
            ))}
          </div>
          {status === "present" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1"><span className="text-sm">ساعت ورود</span><input type="time" className="field" value={inTime} onChange={(e) => setIn(e.target.value)} /></label>
              <label className="space-y-1"><span className="text-sm">ساعت خروج</span><input type="time" className="field" value={outTime} onChange={(e) => setOut(e.target.value)} /></label>
            </div>
          )}
          {err && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter><Button size="lg" className="w-full" onClick={save}>ذخیره</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecordRow({ r, showName }: { r: AttRecord; showName?: boolean }) {
  const db = useDB();
  const [edit, setEdit] = useState(false);
  const [forgive, setForgive] = useState(false);
  const [reason, setReason] = useState("");
  const emp = db.employees.find((e) => e.id === r.employeeId);
  const violation = r.lateMin > 0 || r.earlyMin > 0;
  return (
    <div className="surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          {showName && <div className="font-semibold">{fullName(emp)}</div>}
          <div className="text-sm text-muted-foreground">{formatKey(r.date)}</div>
        </div>
        <div className="flex gap-1">
          <Badge variant={r.status === "present" ? "secondary" : "outline"}>{STATUS_NAMES[r.status]}</Badge>
          {db.holidays.includes(r.date) && <Badge variant="outline">تعطیل</Badge>}
        </div>
      </div>
      {r.status === "present" && (
        <div className="mt-2 text-sm">
          ورود {r.inTime ? fa(r.inTime) : "—"} · خروج {r.outTime ? fa(r.outTime) : "—"}
          <span className="text-muted-foreground"> (استاندارد {fa(r.stdStart)} تا {fa(r.stdEnd)})</span>
        </div>
      )}
      {violation && (
        <div className={`mt-2 space-y-1 rounded-lg p-2 text-sm ${r.forgiven ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
          {r.lateMin > 0 && <div>تأخیر {fa(r.lateMin)} دقیقه — {r.lateLabel}</div>}
          {r.earlyMin > 0 && <div>تعجیل {fa(r.earlyMin)} دقیقه — {r.earlyLabel}</div>}
          {r.forgiven && <div className="font-semibold">بخشوده شد{r.forgiveReason ? `: ${r.forgiveReason}` : ""}</div>}
        </div>
      )}
      <div className="no-print mt-2 flex justify-end gap-1">
        {violation && (
          <Button size="sm" variant="ghost" onClick={() => (r.forgiven ? forgiveRecord(r.id, false) : (setReason(""), setForgive(true)))}>
            <HandHeart className="size-4" />{r.forgiven ? "لغو بخشودگی" : "بخشودگی"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil className="size-4" />ویرایش</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("این رکورد حذف شود؟")) { deleteRecord(r.id); toast("رکورد حذف شد"); } }}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <RecordDialog open={edit} onOpenChange={setEdit} record={r} />
      <Dialog open={forgive} onOpenChange={setForgive}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>بخشودگی جریمه</DialogTitle></DialogHeader>
          <Textarea placeholder="دلیل بخشودگی" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button className="w-full" onClick={() => { forgiveRecord(r.id, true, reason.trim()); setForgive(false); toast.success("جریمه بخشوده شد"); }}>تأیید</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const unitName = (u: keyof typeof UNIT_NAMES) => UNIT_NAMES[u];
