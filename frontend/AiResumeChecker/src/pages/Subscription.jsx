import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Calendar, ShieldCheck, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { paymentApi } from "@/api/payment";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Subscription() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    paymentApi
      .getSubscription()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const result = await paymentApi.createPortalSession();
      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error(err);
      alert("Could not open billing portal. Please try again.");
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-[280px] rounded-3xl" />
      </div>
    );
  }

  const isPro = data?.plan === "pro";

  const rows = [
    {
      icon: ShieldCheck,
      label: "Current Plan",
      value: isPro ? "Pro" : "Free",
    },
    {
      icon: Zap,
      label: "Subscription Status",
      value: data?.subscriptionStatus
        ? data.subscriptionStatus.charAt(0).toUpperCase() +
          data.subscriptionStatus.slice(1)
        : "—",
    },
    {
      icon: CreditCard,
      label: "Payment Status",
      value: data?.paymentStatus
        ? data.paymentStatus.charAt(0).toUpperCase() +
          data.paymentStatus.slice(1)
        : "—",
    },
    {
      icon: Calendar,
      label: "Purchase Date",
      value: formatDate(data?.subscribedAt),
    },
    {
      icon: Calendar,
      label: isPro ? "Next Renewal" : "Expiration Date",
      value: formatDate(data?.currentPeriodEnd),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Subscription
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Manage your plan and view billing details.
        </p>
      </div>

      <Card className="max-w-xl">
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
                <row.icon size={15} />
                {row.label}
              </div>
              <div className="text-sm font-semibold text-[var(--ink)]">
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {!isPro ? (
          <Button
            variant="accent"
            size="md"
            className="w-full mt-5"
            onClick={() => nav("/pricing")}
          >
            <Zap size={14} /> Upgrade to Pro
          </Button>
        ) : (
          <Button
            variant="outline"
            size="md"
            className="w-full mt-5"
            onClick={handleManageBilling}
            disabled={portalLoading}
          >
            <CreditCard size={14} />
            {portalLoading ? "Opening..." : "Manage Billing"}
          </Button>
        )}
      </Card>
    </div>
  );
}