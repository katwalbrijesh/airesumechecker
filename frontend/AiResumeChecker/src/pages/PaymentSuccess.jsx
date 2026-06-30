import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
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