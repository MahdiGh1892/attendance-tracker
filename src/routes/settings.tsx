import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/shared";
import { fa, shortDate, toEn, todayKey, WEEKDAYS } from "@/lib/jalali";
import { UNIT_NAMES, type PenaltyMode, type PenaltyUnit, type Rules } from "@/lib/penalty";
import { getDB, resetAll, restoreBackup, setPin, setRules, setSchedule, toggleHoliday, useDB, type DB } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات | ثبت تردد کارکنان" },
      { name: "description", content: "ساعت کاری، قوانین جریمه، رمز و پشتیبان‌گیری." },
      { property: "og:title", content: "تنظیمات ثبت تردد" },
      { property: "og:description", content: "ساعت کاری، قوانین جریمه، رمز و پشتیبان‌گیری." },
    ],
  }),
  component: SettingsPage,
});

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="surface space-y-3 p-4">
    <div><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
    {children}
  </section>
);
const num = (v: string) => Math.max(0, Number(toEn(v)) || 0);

function SettingsPage() {
  const db = useDB();
  const [sched, setSched] = useState<DB["schedule"]>(db.schedule);
  const [rules, setR] = useState<Rules>(db.rules);
  const [pin, setPinInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setSched(db.schedule); setR(db.rules); }, [db.schedule, db.rules]);

  const backup = () => {
    const blob = new Blob([JSON.stringify(getDB())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taradod-backup-${todayKey()}.json`;
    a.click();
    toast.success("فایل پشتیبان ذخیره شد");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="تنظیمات" />

      <Section title="ساعت کاری" hint="تغییرات فقط روی ثبت‌های بعدی اعمال می‌شود؛ سوابق گذشته تغییر نمی‌کند.">
        {sched.days.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <Switch checked={d.workday} onCheckedChange={(v) => setSched({ ...sched, days: sched.days.map((x, j) => (j === i ? { ...x, workday: v } : x)) })} />
            <span className="w-20 text-sm">{WEEKDAYS[i]}</span>
            <input type="time" disabled={!d.workday} className="field h-10 flex-1" value={d.start} onChange={(e) => setSched({ ...sched, days: sched.days.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} />
            <input type="time" disabled={!d.workday} className="field h-10 flex-1" value={d.end} onChange={(e) => setSched({ ...sched, days: sched.days.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">مهلت ورود (دقیقه)<Input className="mt-1 h-11" inputMode="numeric" value={fa(sched.graceIn)} onChange={(e) => setSched({ ...sched, graceIn: num(e.target.value) })} /></label>
          <label className="text-sm">مهلت خروج (دقیقه)<Input className="mt-1 h-11" inputMode="numeric" value={fa(sched.graceOut)} onChange={(e) => setSched({ ...sched, graceOut: num(e.target.value) })} /></label>
        </div>
        <Button className="w-full" onClick={() => { setSchedule(sched); toast.success("ساعت کاری ذخیره شد"); }}>ذخیره ساعت کاری</Button>
      </Section>

      <Section title="قوانین جریمه" hint="جریمه هنگام ثبت محاسبه و همراه رکورد ذخیره می‌شود.">
        <div className="grid grid-cols-3 gap-1.5">
          {([["fixed", "ثابت"], ["perMinute", "دقیقه‌ای"], ["tiered", "پله‌ای"]] as [PenaltyMode, string][]).map(([k, l]) => (
            <Button key={k} variant={rules.mode === k ? "default" : "secondary"} onClick={() => setR({ ...rules, mode: k })}>{l}</Button>
          ))}
        </div>
        <label className="block text-sm">واحد مجازات
          <select className="field mt-1" value={rules.unit} onChange={(e) => setR({ ...rules, unit: e.target.value as PenaltyUnit })}>
            {(Object.keys(UNIT_NAMES) as PenaltyUnit[]).map((u) => <option key={u} value={u}>{UNIT_NAMES[u]}</option>)}
          </select>
        </label>
        {rules.mode === "fixed" && (
          <label className="block text-sm">مقدار به‌ازای هر تخلف<Input className="mt-1 h-11" inputMode="numeric" value={fa(rules.fixed)} onChange={(e) => setR({ ...rules, fixed: num(e.target.value) })} /></label>
        )}
        {rules.mode === "perMinute" && (
          <label className="block text-sm">مقدار به‌ازای هر دقیقه<Input className="mt-1 h-11" inputMode="numeric" value={fa(rules.perMinute)} onChange={(e) => setR({ ...rules, perMinute: num(e.target.value) })} /></label>
        )}
        {rules.mode === "tiered" && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-1.5 text-xs text-muted-foreground"><span>تا (دقیقه)</span><span>عنوان</span><span>مقدار</span><span /></div>
            {rules.tiers.map((t, i) => {
              const set = (p: Partial<typeof t>) => setR({ ...rules, tiers: rules.tiers.map((x, j) => (j === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-1.5">
                  <Input placeholder="بیشتر" inputMode="numeric" value={t.upTo == null ? "" : fa(t.upTo)} onChange={(e) => set({ upTo: e.target.value.trim() ? num(e.target.value) : null })} />
                  <Input value={t.label} onChange={(e) => set({ label: e.target.value })} />
                  <Input inputMode="numeric" value={fa(t.amount)} onChange={(e) => set({ amount: num(e.target.value) })} />
                  <Button size="icon" variant="ghost" aria-label="حذف پله" onClick={() => setR({ ...rules, tiers: rules.tiers.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
                </div>
              );
            })}
            <Button variant="secondary" size="sm" onClick={() => setR({ ...rules, tiers: [...rules.tiers, { upTo: null, label: "", amount: 0 }] })}><Plus />افزودن پله</Button>
            <p className="text-xs text-muted-foreground">خانه‌ی «تا» را برای آخرین پله خالی بگذارید.</p>
          </div>
        )}
        <Button className="w-full" onClick={() => { setRules(rules); toast.success("قوانین ذخیره شد"); }}>ذخیره قوانین</Button>
      </Section>

      <Section title="روزهای تعطیل" hint="در روز تعطیل جریمه‌ای محاسبه نمی‌شود. از صفحه‌ی «ثبت تردد» هم قابل علامت‌گذاری است.">
        <div className="flex flex-wrap gap-1.5">
          {[...db.holidays].sort().reverse().map((h) => (
            <Button key={h} size="sm" variant="secondary" onClick={() => toggleHoliday(h)}>{shortDate(h)} ✕</Button>
          ))}
          {db.holidays.length === 0 && <span className="text-sm text-muted-foreground">هیچ روزی علامت نخورده است.</span>}
        </div>
      </Section>

      <Section title="رمز ورود" hint={db.pin ? "رمز فعال است." : "برای محافظت از اطلاعات، رمز تعیین کنید."}>
        <div className="flex gap-2">
          <Input type="password" inputMode="numeric" className="h-11" placeholder="رمز جدید (حداقل ۴ رقم)" value={pin} onChange={(e) => setPinInput(toEn(e.target.value))} />
          <Button onClick={() => { if (pin.length < 4) { toast.error("رمز باید حداقل ۴ رقم باشد."); return; } setPin(pin); setPinInput(""); sessionStorage.setItem("taradod-unlocked", "1"); toast.success("رمز ذخیره شد"); }}>ذخیره</Button>
        </div>
        {db.pin && <Button variant="ghost" className="text-destructive" onClick={() => { setPin(null); toast("رمز برداشته شد"); }}>برداشتن رمز</Button>}
      </Section>

      <Section title="پشتیبان‌گیری" hint="فایل پشتیبان روی همین گوشی ذخیره می‌شود و می‌توانید آن را به گوشی دیگر منتقل کنید.">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={backup}>تهیه پشتیبان</Button>
          <Button variant="secondary" size="lg" onClick={() => fileRef.current?.click()}>بازیابی</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!confirm("اطلاعات فعلی با فایل پشتیبان جایگزین شود؟")) return;
          const err = restoreBackup(await f.text());
          err ? toast.error(err) : toast.success("اطلاعات بازیابی شد");
          e.target.value = "";
        }} />
        <Button variant="ghost" className="w-full text-destructive" onClick={() => { if (confirm("همه‌ی اطلاعات پاک شود؟ این کار برگشت‌پذیر نیست.")) { resetAll(); toast("همه‌چیز پاک شد"); } }}>پاک‌کردن همه‌ی اطلاعات</Button>
      </Section>
    </div>
  );
}
