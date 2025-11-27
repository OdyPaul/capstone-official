// src/pages/ResetPassword.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import bgImg from ".././assets/public/bg_login.jpg";
import sideImg from ".././assets/public/login_image.png";
import authService from "../features/auth/authService";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("EMAIL"); // EMAIL -> OTP -> PASSWORD
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [resetSession, setResetSession] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  // 1) Request OTP to email
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!cleanEmail) {
      toast.error("Please enter your email");
      return;
    }
    try {
      setLoading(true);
      await authService.requestPasswordReset(cleanEmail);
      toast.success("6-digit code sent to your email");
      setStep("OTP");
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to send code"
      );
    } finally {
      setLoading(false);
    }
  };

  // 2) OTP boxes handlers
  const handleChangeOtp = (idx, value) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[idx] = value;
    setOtpDigits(next);
    if (value && idx < otpRefs.current.length - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    try {
      setLoading(true);
      const { success, resetSession } = await authService.verifyPasswordReset(
        cleanEmail,
        code
      );
      if (!success || !resetSession) {
        toast.error("Invalid code");
        return;
      }
      setResetSession(resetSession);
      toast.success("Code verified. Please set a new password.");
      setStep("PASSWORD");
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // 3) Apply new password
  const handleApplyNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirm) {
      toast.error("Please fill in both password fields");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!resetSession) {
      toast.error("Missing reset session. Please request a new code.");
      setStep("EMAIL");
      return;
    }
    try {
      setLoading(true);
      await authService.completePasswordReset({
        email: cleanEmail,
        resetSession,
        newPassword,
      });
      toast.success("Password updated. You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  // Step-specific content on the right side
  const renderContent = () => {
    if (step === "EMAIL") {
      return (
        <form onSubmit={handleRequestCode} className="form">
          <p style={{ marginBottom: 16, color: "#4b5563" }}>
            Enter the email associated with your account. We’ll send a 6-digit
            code to reset your password.
          </p>

          <label className="field">
            <span className="icon" aria-hidden="true">
              <FaUser />
            </span>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="submit"
            disabled={loading || !cleanEmail}
          >
            {loading ? "SENDING…" : "SEND CODE"}
          </button>

          <p className="helper">
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                border: "none",
                background: "none",
                color: "#166534",
                cursor: "pointer",
              }}
            >
              Back to login
            </button>
          </p>
        </form>
      );
    }

    if (step === "OTP") {
      return (
        <form onSubmit={handleVerifyCode} className="form">
          <p
            style={{
              marginBottom: 8,
              color: "#16a34a",
              fontWeight: 500,
            }}
          >
            6-digit code sent!
          </p>
          <p style={{ marginBottom: 16, color: "#4b5563" }}>
            Check your inbox: <strong>{cleanEmail}</strong>
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              margin: "12px 0 20px",
            }}
          >
            {otpDigits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (otpRefs.current[idx] = el)}
                value={d}
                onChange={(e) => handleChangeOtp(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKey(idx, e)}
                inputMode="numeric"
                maxLength={1}
                style={{
                  width: 40,
                  height: 48,
                  textAlign: "center",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 20,
                }}
              />
            ))}
          </div>

          <button type="submit" className="submit" disabled={loading}>
            {loading ? "VERIFYING…" : "VERIFY CODE"}
          </button>

          <p className="helper">
            <button
              type="button"
              onClick={handleRequestCode}
              style={{
                border: "none",
                background: "none",
                color: "#166534",
                cursor: "pointer",
              }}
            >
              Resend code
            </button>
          </p>
        </form>
      );
    }

    // step === 'PASSWORD'
    return (
      <form onSubmit={handleApplyNewPassword} className="form">
        <p style={{ marginBottom: 16, color: "#4b5563" }}>
          Set a new password for <strong>{cleanEmail}</strong>.
        </p>

        <label className="field">
          <span className="icon">
            <FaLock />
          </span>
          <input
            type={showNewPw ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle"
            onClick={() => setShowNewPw((s) => !s)}
          >
            {showNewPw ? <FaEyeSlash /> : <FaEye />}
          </button>
        </label>

        <label className="field">
          <span className="icon">
            <FaLock />
          </span>
          <input
            type={showConfirmPw ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle"
            onClick={() => setShowConfirmPw((s) => !s)}
          >
            {showConfirmPw ? <FaEyeSlash /> : <FaEye />}
          </button>
        </label>

        <button type="submit" className="submit" disabled={loading}>
          {loading ? "UPDATING…" : "RESET PASSWORD"}
        </button>

        <p className="helper">
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              border: "none",
              background: "none",
              color: "#166534",
              cursor: "pointer",
            }}
          >
            Back to login
          </button>
        </p>
      </form>
    );
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bgImg})` }}>
      <div className="bg-overlay" />
      <main className="login-shell">
        <section className="login-card">
          <div className="login-left">
            <div className="illustration-wrap">
              <img
                src={sideImg}
                alt="Reset password illustration"
                className="illustration"
              />
            </div>
          </div>

          <div className="login-right">
            <header className="login-header">
              <div className="accent-bar" />
              <h1>Reset Password</h1>
            </header>

            {renderContent()}
          </div>
        </section>
      </main>

      {/* same CSS as Login.jsx so it looks identical */}
      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          background-size: cover;
          background-position: center;
          position: relative;
          display: grid;
          place-items: center;
          padding: 24px;
          overflow: hidden;
        }
        .bg-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(80% 80% at 10% 10%, rgba(255,255,255,.1), transparent),
                      radial-gradient(60% 60% at 90% 20%, rgba(255,255,255,.07), transparent),
                      rgba(3, 30, 15, .45);
          backdrop-filter: blur(1.5px);
        }
        .login-shell {
          position: relative;
          width: 100%;
          max-width: 1120px;
          z-index: 1;
        }
        .login-card {
          position: relative;
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(4, 20, 10, 0.35);
          overflow: hidden;
        }
        .login-card::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 40px;
          bottom: 40px;
          width: 1px;
          background: #e5e7eb;
          transform: translateX(-0.5px);
          pointer-events: none;
        }
        .login-left {
          background: #ffffff;
          padding: 40px 28px;
          display: grid;
          place-items: center;
        }
        .illustration-wrap {
          width: 100%;
          max-width: 520px;
          aspect-ratio: 4 / 3;
          display: grid;
          place-items: center;
        }
        .illustration {
          width: 88%;
          height: auto;
          object-fit: contain;
        }
        .login-right {
          background: #ffffff;
          padding: 48px 48px 40px 48px;
        }
        .login-header {
          margin-bottom: 28px;
        }
        .login-header h1 {
          font-size: 28px;
          line-height: 1.25;
          margin: 12px 0 0 0;
          color: #052e16;
          font-weight: 700;
        }
        .accent-bar {
          width: 38px;
          height: 6px;
          border-radius: 999px;
          background: #16a34a;
        }
        .form {
          display: grid;
          gap: 18px;
        }
        .field {
          position: relative;
          display: block;
        }
        .field input {
          width: 100%;
          padding: 14px 48px 14px 48px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          outline: none;
          transition: border .2s, box-shadow .2s, background .2s;
          font-size: 15px;
        }
        .field input::placeholder {
          color: #94a3b8;
        }
        .field input:focus {
          border-color: #156f36;
          box-shadow: 0 0 0 4px rgba(34,197,94,0.16);
          background: #ffffff;
        }
        .field .icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          opacity: .65;
          display: inline-flex;
          align-items: center;
        }
        .toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: 0;
          font-size: 18px;
          cursor: pointer;
          opacity: .7;
          display: inline-flex;
          align-items: center;
        }
        .toggle:hover {
          opacity: 1;
        }
        .submit {
          display: inline-block;
          width: 100%;
          padding: 14px 16px;
          border-radius: 999px;
          background: #146f35;
          color: #fff;
          font-weight: 700;
          letter-spacing: 1.4px;
          border: none;
          cursor: pointer;
          transition: transform .05s ease, box-shadow .2s ease, background .2s ease;
          box-shadow: 0 4px 10px rgba(22,163,74,.35);
        }
        .submit:hover {
          background: #15803d;
          box-shadow: 0 2px 5px rgba(21,128,61,.45);
        }
        .submit:active {
          transform: translateY(1px);
        }
        .helper {
          margin-top: 12px;
          text-align: center;
        }
        .helper a {
          color: #166534;
          text-decoration: none;
        }
        .helper a:hover {
          text-decoration: underline;
        }
        @media (max-width: 980px) {
          .login-card {
            grid-template-columns: 1fr;
          }
          .login-card::after {
            display: none;
          }
          .login-right {
            padding: 36px 28px 28px 28px;
          }
          .illustration-wrap {
            aspect-ratio: auto;
          }
          .illustration {
            width: 70%;
          }
        }
      `}</style>
    </div>
  );
}
