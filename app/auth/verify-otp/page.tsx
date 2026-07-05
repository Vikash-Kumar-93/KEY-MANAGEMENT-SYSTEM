"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOTPPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      router.push("/auth/login");
    } else {
      setUserId(userId);
    }
  }, [router]);

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string> = {
        userId,
      };

      if (useBackupCode) {
        body.backupCode = otpCode;
      } else {
        body.otpCode = otpCode;
      }

      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("userId");
      router.push("/vault");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setError("");
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Device</h1>
        <p className="text-gray-600 text-sm mb-6">
          Enter the 6-digit code from your authenticator app
        </p>

        <form onSubmit={handleVerifyOTP} className="space-y-6">
          {/* OTP Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {useBackupCode ? "Backup Code" : "Authentication Code"}
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(
                  e.target.value
                    .replace(/[^0-9A-Za-z]/g, "")
                    .slice(0, useBackupCode ? 8 : 6)
                )
              }
              maxLength={useBackupCode ? 8 : 6}
              placeholder={useBackupCode ? "ABCDEFGH" : "000000"}
              className="w-full px-4 py-3 text-center text-4xl tracking-widest border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              {useBackupCode
                ? "Enter one of your single-use backup codes."
                : "Check your authenticator app (Google Authenticator, Authy, etc.)."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || otpCode.length !== (useBackupCode ? 8 : 6)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? "Verifying..." : "Verify & Unlock"}
          </button>
        </form>

        <div className="my-6 border-t border-gray-300" />

        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">Don&apos;t have your authenticator?</p>
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setOtpCode("");
              setError("");
            }}
            className="w-full border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
          >
            {useBackupCode ? "Use Authenticator Code Instead" : "Use Backup Code Instead"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-300">
          <button
            onClick={handleResendOTP}
            disabled={resendCountdown > 0}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 font-semibold"
          >
            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
