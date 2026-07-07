import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, CheckCircle } from "lucide-react";
import {
  AuthShell,
  AuthField,
  AuthPrimaryButton,
  AuthErrorBanner,
} from "@/components/auth/AuthShell";
import AILogo from "@/components/layout/AILogo";
import { authApi } from "@/api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!token || !email) {
      setErr("This reset link is invalid. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, newPassword });
      setDone(true);
      setTimeout(() => nav("/login"), 2000);
    } catch (e) {
      setErr(e.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          Almost there.
          <br />
          <em style={{ fontStyle: "italic" }}>Set your new password.</em>
        </>
      }
      subhead="Choose a strong password to keep your account secure."
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-12">
          <AILogo size={48} />
        </div>

        {done ? (
          <>
            <div className="h-12 w-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-4">
              <CheckCircle size={22} />
            </div>
            <h1 className="font-display text-[28px] font-semibold tracking-tight text-[var(--ink)] leading-[1.05]">
              Password updated
            </h1>
            <p className="text-[var(--ink-muted)] mt-2 text-[15px]">
              Redirecting you to sign in...
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[34px] font-semibold tracking-tight text-[var(--ink)] leading-[1.05]">
              New password
            </h1>
            <p className="text-[var(--ink-muted)] mt-2 text-[15px]">
              For <strong>{email || "your account"}</strong>
            </p>

            <form onSubmit={onSubmit} className="mt-9 space-y-4">
              <AuthField
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="At least 8 characters"
                icon={Lock}
                minLength={8}
              />

              <AuthErrorBanner>{err}</AuthErrorBanner>

              <div className="pt-1">
                <AuthPrimaryButton type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Reset password <ArrowRight size={15} />
                    </>
                  )}
                </AuthPrimaryButton>
              </div>
            </form>

            <div className="text-sm text-[var(--ink-muted)] text-center mt-8">
              <Link
                to="/login"
                className="text-[var(--accent-strong)] font-semibold hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </AuthShell>
  );
}