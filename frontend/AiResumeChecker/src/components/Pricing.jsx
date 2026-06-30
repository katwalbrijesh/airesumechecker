import { useState } from "react";
import "./Pricing.css";

const faqs = [
  {
    question: "How many resumes can I check per month?",
    answer: "On the Free plan, you get 2 resume checks per month. On the Pro plan ($19/month), you get unlimited resume checks with full AI analysis.",
  },
  {
    question: "What happens when I run out of checks?",
    answer: "On the Free plan, you'll be prompted to upgrade to Pro. Your existing analysis results are always saved and accessible.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes! You can cancel your Pro subscription anytime. No contracts, no hidden fees. Your access continues until the end of your billing period.",
  },
  {
    question: "What does the AI actually check?",
    answer: "Our AI powered by Gemini analyzes your resume for ATS compatibility, keyword optimization, formatting issues, grammar, and gives you specific improvement suggestions.",
  },
  {
    question: "Is my resume data private and secure?",
    answer: "Absolutely. Your resume data is encrypted and never shared with third parties. You can delete your data anytime from your account settings.",
  },
  {
    question: "Do I need a credit card to start?",
    answer: "No credit card required for the Free plan. You only need payment details when upgrading to Pro.",
  },
];

export default function Pricing() {
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  const handleCheckout = async () => {
    setLoading(true);
    try {
    const res = await fetch("/api/payment/create-checkout-session", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
       }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <section id="pricing">
      {/* Pricing Card */}
      <div className="pricing-wrapper">
        <div className="pricing-label">PRICING</div>
        <h2 className="pricing-title">
          One plan. <span className="pricing-green">Built for job seekers.</span>
        </h2>
        <p className="pricing-subtitle">
          Everything you need to land your next role.
        </p>

        <div className="plan-box">
          <div className="plan-box-left">
            <div className="plan-tag">PRO</div>
            <div className="plan-count">01 / 01</div>
            <h3 className="plan-name">Resume Roaster Pro</h3>
            <p className="plan-desc">
              For job seekers who want an unfair advantage.
            </p>
            <div className="plan-price-row">
              <span className="plan-price">$19</span>
              <span className="plan-period">/ month</span>
            </div>
            <p className="plan-note">
              Cancel anytime. No contracts.
            </p>
            <button className="plan-cta" onClick={handleCheckout} disabled={loading}>
              {loading ? "Redirecting..." : "Get started →"}
            </button>
          </div>

          <div className="plan-box-right">
            <p className="whats-included">WHAT'S INCLUDED</p>
            <ul className="plan-list">
              <li>✓ Unlimited resume checks</li>
              <li>✓ Advanced Gemini AI analysis</li>
              <li>✓ ATS score & optimization</li>
              <li>✓ Resume rewriting suggestions</li>
              <li>✓ Keyword gap analysis</li>
              <li>✓ Export feedback as PDF</li>
              <li>✓ Resume version history</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-wrapper">
        <div className="faq-left">
          <p className="faq-label">FAQ</p>
          <h2 className="faq-title">Before you decide, read this.</h2>
          <p className="faq-sub">
            Answers to the questions most people have before upgrading. Still unsure? Drop us an email.
          </p>
        </div>

        <div className="faq-right">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button className="faq-question" onClick={() => toggle(i)}>
                <span>{faq.question}</span>
                <span className="faq-icon">{openIndex === i ? "×" : "+"}</span>
              </button>
              {openIndex === i && (
                <p className="faq-answer">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}