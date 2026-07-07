import { useEffect, useState } from "react";
import { Plus, Ban } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/api/admin";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    type: "full",
    discountPercent: "",
    maxUses: 1,
    expiresInDays: "",
  });

  function load() {
    setLoading(true);
    adminApi
      .listCoupons()
      .then((data) => setCoupons(data.coupons))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        maxUses: form.type === "discount" ? 1 : Number(form.maxUses) || 1,
      };
      if (form.type === "discount") {
        payload.discountPercent = Number(form.discountPercent);
      }
      if (form.expiresInDays) {
        payload.expiresInDays = Number(form.expiresInDays);
      }

      await adminApi.createCoupon(payload);
      setForm({
        code: "",
        type: "full",
        discountPercent: "",
        maxUses: 1,
        expiresInDays: "",
      });
      load();
    } catch (err) {
      setError(err.message || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id) {
    await adminApi.deactivateCoupon(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Admin — Coupons
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Create and manage coupon codes.
        </p>
      </div>

      <Card className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-[var(--ink)]">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. FAMILY7D"
              maxLength={32}
              required
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--ink)]">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm"
            >
              <option value="full">Full access (1 month Pro, free)</option>
              <option value="discount">Discount (first month only)</option>
            </select>
          </div>

          {form.type === "discount" && (
            <div>
              <label className="text-sm font-semibold text-[var(--ink)]">
                Discount % off (e.g. 50 = $19 → $9.50)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm"
              />
            </div>
          )}

          {form.type === "full" && (
            <div>
              <label className="text-sm font-semibold text-[var(--ink)]">
                Max number of people who can use this code
              </label>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-[var(--ink)]">
              Code expires in how many days? (blank = never expires)
            </label>
            <input
              type="number"
              min="1"
              value={form.expiresInDays}
              onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
              placeholder="e.g. 7"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" variant="accent" disabled={creating}>
            <Plus size={14} /> {creating ? "Creating..." : "Create coupon"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-base font-semibold mb-4">All coupons</h2>
        {loading ? (
          <p className="text-sm text-[var(--ink-muted)]">Loading...</p>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No coupons yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {coupons.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold text-sm text-[var(--ink)]">
                    {c.code}{" "}
                    <span className="text-xs text-[var(--ink-muted)]">
                      ({c.type}
                      {c.type === "discount" ? ` - ${c.discountPercent}% off` : ""})
                    </span>
                  </div>
                  <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                    Used {c.usedCount}/{c.maxUses} ·{" "}
                    {c.expiresAt
                      ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}`
                      : "Never expires"}{" "}
                    · {c.isActive ? "Active" : "Deactivated"}
                  </div>
                </div>
                {c.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(c._id)}
                  >
                    <Ban size={13} /> Deactivate
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}