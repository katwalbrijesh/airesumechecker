import { useNavigate } from "react-router-dom";
import { Upload, BarChart3, Calendar, Zap, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function memberSince(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

const FREE_LIMIT = 2;

export function ProfileCard({ user, stats }) {
  const nav = useNavigate();
  const since = memberSince(user?.createdAt);

  const isPro = user?.plan === "pro";
  const used = user?.analysisCount ?? 0;
  const remaining = Math.max(0, FREE_LIMIT - used);
  const usagePercent = Math.min(100, (used / FREE_LIMIT) * 100);

  return (
    <Card className="h-full flex flex-col items-center text-center">
      <div className="relative">
        <Avatar name={user?.name} size={72} className="ring-4" />
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--surface)] flex items-center justify-center text-[10px] text-white font-bold">
          ✓
        </span>
      </div>

      <div className="mt-3">
        <div className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]">
          {user?.name || "Ravi Teja"}
        </div>
        <div className="text-xs text-[var(--ink-muted)] mt-0.5">
          {user?.email || "you@example.com"}
        </div>
        <Badge tone="accent" className="mt-2">
          {isPro ? "Pro plan" : "Free plan"}
        </Badge>
      </div>

      {/* ── Usage Status ── */}
      {isPro ? (
        <div className="w-full mt-4 px-3 py-3 rounded-xl bg-[var(--accent-soft)] flex items-center gap-2">
          <Zap size={14} className="text-[var(--accent-strong)] shrink-0" />
          <div className="text-left">
            <div className="text-[11px] font-semibold text-[var(--accent-strong)]">
              Unlimited checks active
            </div>
            <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
              You're on the Pro plan
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full mt-4 px-3 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Lock size={11} className="text-[var(--ink-muted)]" />
              <span className="text-[11px] font-semibold text-[var(--ink)]">
                Free checks
              </span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--ink)]">
              {used} / {FREE_LIMIT} used
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usagePercent}%`,
                background: remaining === 0
                  ? "#dc2626"
                  : remaining === 1
                  ? "#f59e0b"
                  : "var(--accent)",
              }}
            />
          </div>

          <div className="mt-2 text-[10px] text-[var(--ink-muted)]">
            {remaining === 0
              ? "No checks left this month"
              : `${remaining} check${remaining === 1 ? "" : "s"} remaining`}
          </div>

          <button
           onClick={() => nav("/pricing")}
            className="mt-3 w-full py-1.5 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #206138 0%, #16a34a 100%)",
            }}
          >
           Upgrade to Pro
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 w-full mt-5 pt-5 border-t border-[var(--border)]">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
              {s.label}
            </div>
            <div className="font-display tabular text-xl font-semibold mt-0.5 text-[var(--ink)]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions + member since */}
      <div className="mt-auto pt-5 w-full space-y-3">
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => nav("/resumes")}
            className="w-full"
          >
            <Upload size={13} /> Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => nav("/insights")}
            className="w-full"
          >
            <BarChart3 size={13} /> Insights
          </Button>
        </div>
        {since && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--ink-muted)]">
            <Calendar size={10} />
            Member since {since}
          </div>
        )}
      </div>
    </Card>
  );
}