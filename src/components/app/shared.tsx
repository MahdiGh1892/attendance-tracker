import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CalendarDays, Home, ClipboardCheck, Users, FileBarChart, Settings, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fa, formatKey, makeKey, monthLength, MONTHS, parseKey, rangeFor, todayKey, weekdayIdx, WEEKDAYS, type RangeKind } from "@/lib/jalali";
import { useDB } from "@/lib/store";

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "success" | "danger" | "warning" }) {
  return (
    <div className="surface p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-warning-foreground dark:text-warning",
        )}
      >
        {typeof value === "number" ? fa(value) : value}
      </div>
    </div>
  );
}

export function JalaliDatePicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseKey(value));
  useEffect(() => setView(parseKey(value)), [value, open]);
  const first = makeKey(view.jy, view.jm, 1);
  const lead = weekdayIdx(first);
  const len = monthLength(view.jy, view.jm);
  const today = todayKey();
  const move = (d: number) => {
    let m = view.jm + d, y = view.jy;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setView({ jy: y, jm: m, jd: 1 });
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="field flex items-center justify-between text-start">
        <span>{formatKey(value)}</span>
        <CalendarDays className="size-4 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>انتخاب تاریخ</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="ماه قبل"><ChevronRight /></Button>
            <div className="font-semibold">{MONTHS[view.jm - 1] ?? ""} {fa(view.jy)}</div>
            <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="ماه بعد"><ChevronLeft /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((w) => <div key={w}>{w.slice(0, 1)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: len }).map((_, i) => {
              const k = makeKey(view.jy, view.jm, i + 1);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { onChange(k); setOpen(false); }}
                  className={cn(
                    "aspect-square rounded-lg text-sm transition-colors hover:bg-secondary",
                    k === today && "ring-1 ring-ring",
                    k === value && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {fa(i + 1)}
                </button>
              );
            })}
          </div>
          <Button variant="secondary" onClick={() => { onChange(today); setOpen(false); }}>امروز</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

const RANGE_LABELS: Record<RangeKind, string> = { day: "امروز", week: "این هفته", month: "این ماه", year: "امسال", custom: "دلخواه" };
export function RangePicker({ value, onChange }: { value: [string, string]; onChange: (r: [string, string]) => void }) {
  const [kind, setKind] = useState<RangeKind>("month");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(RANGE_LABELS) as RangeKind[]).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kind === k ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => { setKind(k); if (k !== "custom") onChange(rangeFor(k)); }}
          >
            {RANGE_LABELS[k]}
          </Button>
        ))}
      </div>
      {kind === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <div><div className="mb-1 text-xs text-muted-foreground">از</div><JalaliDatePicker value={value[0]} onChange={(k) => onChange([k, value[1]])} /></div>
          <div><div className="mb-1 text-xs text-muted-foreground">تا</div><JalaliDatePicker value={value[1]} onChange={(k) => onChange([value[0], k])} /></div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { to: "/", label: "خانه", icon: Home },
  { to: "/today", label: "ثبت تردد", icon: ClipboardCheck },
  { to: "/employees", label: "کارکنان", icon: Users },
  { to: "/reports", label: "گزارش", icon: FileBarChart },
  { to: "/settings", label: "تنظیمات", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="mx-auto min-h-screen max-w-3xl pb-24">
      <main className="px-4 pt-5">{children}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PinGate({ children }: { children: ReactNode }) {
  const db = useDB();
  const hydrated = useHydrated();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPinInput] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (sessionStorage.getItem("taradod-unlocked") === "1") setUnlocked(true);
  }, []);
  if (!hydrated) return null;
  if (!db.pin || unlocked) return <>{children}</>;
  const submit = () => {
    if (pin === db.pin) {
      sessionStorage.setItem("taradod-unlocked", "1");
      setUnlocked(true);
    } else {
      setErr("رمز اشتباه است.");
      setPinInput("");
    }
  };
  return (
    <div dir="rtl" className="hero-bg flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-4 text-center">
        <Lock className="mx-auto size-10" />
        <h1 className="text-xl font-bold">ثبت تردد کارکنان</h1>
        <p className="text-sm opacity-80">برای ورود رمز را وارد کنید</p>
        <Input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => { setPinInput(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-12 bg-card text-center text-lg tracking-widest text-foreground"
        />
        {err && <p className="text-sm font-semibold">{err}</p>}
        <Button size="lg" variant="secondary" className="w-full" onClick={submit}>ورود</Button>
      </div>
    </div>
  );
}
