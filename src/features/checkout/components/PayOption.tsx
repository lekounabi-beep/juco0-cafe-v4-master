/**
 * Pay Option component - payment method selection card
 */

interface PayOptionProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}

export function PayOption({ active, onClick, icon, title, subtitle, badge }: PayOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-white/15 bg-white/5 hover:border-white/30"
      }`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white">{title}</p>
          {badge && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/85">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-white/60">{subtitle}</p>
      </div>
      <div
        className={`h-5 w-5 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-white/30"}`}
      />
    </button>
  );
}
