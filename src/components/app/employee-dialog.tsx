import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toEn } from "@/lib/jalali";
import { saveEmployee, type Employee } from "@/lib/store";

// کوچک‌کردن عکس تا حجم ذخیره‌سازی کم بماند
function resize(file: File): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const s = 160 / Math.max(img.width, img.height);
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = URL.createObjectURL(file);
  });
}

type EmpForm = { firstName: string; lastName: string; code: string; rank: string; photo?: string | undefined; active: boolean };
const EMPTY_FORM: EmpForm = { firstName: "", lastName: "", code: "", rank: "", photo: undefined, active: true };

export function EmployeeDialog({ open, onOpenChange, employee, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; employee?: Employee | undefined; onSaved?: (() => void) | undefined }) {
  const [f, setF] = useState<EmpForm>(EMPTY_FORM);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setErr("");
      setF(employee ? { firstName: employee.firstName, lastName: employee.lastName, code: employee.code, rank: employee.rank, photo: employee.photo, active: employee.active } : EMPTY_FORM);
    }
  }, [open, employee]);
  const save = () => {
    const e = saveEmployee({ ...f, id: employee?.id, code: toEn(f.code) });
    if (e) return setErr(e);
    onSaved?.();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{employee ? "ویرایش همکار" : "همکار جدید"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-11" placeholder="نام" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
          <Input className="h-11" placeholder="نام خانوادگی" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
          <Input className="h-11" placeholder="شماره پرسنلی" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
          <Input className="h-11" placeholder="درجه یا سمت" value={f.rank} onChange={(e) => setF({ ...f, rank: e.target.value })} />
        </div>
        <label className="flex items-center justify-between text-sm">
          <span>عکس (اختیاری)</span>
          <input type="file" accept="image/*" className="max-w-44 text-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, photo: await resize(file) }); }} />
        </label>
        {f.photo && <img src={f.photo} alt="" className="size-16 rounded-full object-cover" />}
        {employee && (
          <label className="flex items-center justify-between text-sm"><span>فعال</span><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /></label>
        )}
        {err && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{err}</p>}
        <DialogFooter><Button size="lg" className="w-full" onClick={save}>ذخیره</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
