import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { apiClient } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refresh } = useAuth();
  const [status, setStatus] = useState("verifying"); // verifying | success | error

  useEffect(() => {
    async function verify() {
      if (!sessionId) {
        setStatus("error");
        return;
      }
      try {
        await apiClient.get("/payment/verify-session", {
          params: { session_id: sessionId },
        });
        await refresh();
        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }
    verify();
  }, [sessionId, refresh]);

  if (status === "verifying") {
    return (
      <div className="success-page">
        <div className="success-card">
          <Loader2 size={48} className="animate-spin" />
          <h1>Confirming your payment...</h1>
          <p>Hang tight, this only takes a second.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="success-page">
        <div className="success-card">
          <XCircle size={48} color="#dc2626" />
          <h1>Couldn't confirm payment</h1>
          <p>
            Your payment may still be processing. If you were charged and this
            doesn't resolve shortly, please contact support.
          </p>
          <Link to="/dashboard" className="success-button">
            Go to Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">
          <CheckCircle size={48} color="#16a34a" />
        </div>
        <h1>Welcome to Pro! 🎉</h1>
        <p>
          Your subscription is now active. You have full access to unlimited
          resume checks, advanced AI analysis, and all Pro features.
        </p>
        <Link to="/dashboard" className="success-button">
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}