import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, CheckCircle } from "lucide-react";
import {
  AuthShell,
  AuthField,
  AuthPrimaryButton,
  AuthErrorBanner,
} from "@/components/auth/AuthShell";
import AILogo from "@/components/layout/AILogo";
import { authApi } from "@/api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          Forgot something?
          <br />
          <em style={{ fontStyle: "italic" }}>Let's get you back in.</em>
        </>
      }
      subhead="We'll send you a link to reset your password."
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-12">
          <AILogo size={48} />
        </div>

        {sent ? (
          <>
            <div className="h-12 w-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-4">
              <CheckCircle size={22} />
            </div>
            <h1 className="font-display text-[28px] font-semibold tracking-tight text-[var(--ink)] leading-[1.05]">
              Check your email
            </h1>
            <p className="text-[var(--ink-muted)] mt-2 text-[15px]">
              If an account exists for <strong>{email}</strong>, we've sent a
              password reset link. It expires in 1 hour.
            </p>
            <div className="mt-8">
              <Link
                to="/login"
                className="text-sm text-[var(--accent-strong)] font-semibold hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-[34px] font-semibold tracking-tight text-[var(--ink)] leading-[1.05]">
              Reset password
            </h1>
            <p className="text-[var(--ink-muted)] mt-2 text-[15px]">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-9 space-y-4">
              <AuthField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={Mail}
              />

              <AuthErrorBanner>{err}</AuthErrorBanner>

              <div className="pt-1">
                <AuthPrimaryButton type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link <ArrowRight size={15} />
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