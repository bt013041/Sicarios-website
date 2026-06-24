import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftWeek, currentWeek } from "@/lib/utils-cartel";

export function WeekNav({ week, setWeek }) {
  return (
    <div className="flex items-center gap-2" data-testid="week-nav">
      <button
        data-testid="week-prev"
        onClick={() => setWeek(shiftWeek(week, -1))}
        className="p-2 bg-cartel-surface border border-cartel-border rounded-sm hover:border-cartel-borderlt transition-colors text-cartel-textsec"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="px-4 py-2 bg-cartel-surface border border-cartel-border rounded-sm font-mono text-sm text-cartel-text min-w-[120px] text-center" data-testid="week-label">
        {week}
      </div>
      <button
        data-testid="week-next"
        onClick={() => setWeek(shiftWeek(week, 1))}
        className="p-2 bg-cartel-surface border border-cartel-border rounded-sm hover:border-cartel-borderlt transition-colors text-cartel-textsec"
      >
        <ChevronRight size={16} />
      </button>
      <button
        data-testid="week-current"
        onClick={() => setWeek(currentWeek())}
        className="px-3 py-2 bg-cartel-elevated border border-cartel-border rounded-sm text-xs uppercase font-mono tracking-wider text-cartel-textsec hover:text-cartel-text transition-colors"
      >
        Curent
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        {subtitle && <div className="label-mono mb-1">{subtitle}</div>}
        <h1 className="font-heading text-5xl sm:text-6xl tracking-wide text-cartel-text leading-none">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent = "text", icon: Icon, testid }) {
  const colors = {
    text: "text-cartel-text",
    red: "text-cartel-red",
    gold: "text-cartel-gold",
    success: "text-cartel-success",
  };
  return (
    <div
      data-testid={testid}
      className="bg-cartel-surface border border-cartel-border rounded-sm p-5 hover:border-cartel-borderlt transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="label-mono">{label}</span>
        {Icon && <Icon size={16} className="text-cartel-textmuted" />}
      </div>
      <div className={`font-heading text-4xl tracking-wide ${colors[accent]}`}>{value}</div>
    </div>
  );
}
