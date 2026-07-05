"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authenticator } from "otplib";

type SetupData = {
  totpSecret: string;
  qrCodeUrl: string;
  backupCodes: string[];
};

export default function Setup2FAPage() {
  const router = useRouter();
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [testCode, setTestCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"scan" | "verify" | "backup" | "complete">("scan");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    
    const data = sessionStorage.getItem("setupData");
    if (data) {
      setSetupData(JSON.parse(data));
    }
  }, []);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!/^[0-9]{6}$/.test(testCode)) {
        setError("Please enter a valid 6-digit code");
        setLoading(false);
        return;
      }

      if (!setupData?.totpSecret) {
        setError("Missing TOTP secret. Please signup again.");
        setLoading(false);
        return;
      }

      const validCode = authenticator.check(testCode, setupData.totpSecret);

      if (!validCode) {
        setError("Invalid verification code. Try again.");
        setLoading(false);
        return;
      }

      setStep("backup");
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setLoading(false);
    }
  }

  async function handleCompleteSetup() {
    setLoading(true);

    try {
      
      const userId = sessionStorage.getItem("userId");
      if (!userId || !setupData) {
        setError("Session expired. Please signup again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/setup-2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          otpCode: testCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to save 2FA setup");
        setLoading(false);
        return;
      }

      
      sessionStorage.removeItem("setupData");
      sessionStorage.removeItem("userId");
      router.push("/auth/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setLoading(false);
    }
  }

  if (!setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Up 2FA</h1>
        <p className="text-gray-600 text-sm mb-6">
          Secure your PKMS vault with two-factor authentication
        </p>

        {step === "scan" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-4">
                <strong>Step 1:</strong> Scan this QR code with your authenticator app:
              </p>
              {setupData.qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <Image
                    src={setupData.qrCodeUrl}
                    alt="TOTP QR Code"
                    width={200}
                    height={200}
                    className="border-4 border-white"
                  />
                </div>
              )}
              <p className="text-xs text-gray-600 mb-2">
                <strong>Apps:</strong> Google Authenticator, Microsoft Authenticator, Authy, etc.
              </p>
              <p className="text-xs text-gray-600">
                <strong>Manual entry:</strong> {setupData.totpSecret}
              </p>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Next: Verify Code
            </button>
          </div>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Step 2:</strong> Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              className="w-full px-4 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || testCode.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}

        {step === "backup" && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-900 mb-2">
                ⚠️ Save Your Backup Codes
              </p>
              <p className="text-xs text-yellow-800">
                If you lose access to your authenticator app, you can use these codes to regain access.
                Store them somewhere safe!
              </p>
            </div>

            <button
              onClick={() => setShowBackupCodes(!showBackupCodes)}
              className="w-full border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
            >
              {showBackupCodes ? "Hide Codes" : "Show Backup Codes"}
            </button>

            {showBackupCodes && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 font-mono text-sm space-y-2">
                {setupData.backupCodes.map((code: string, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{i + 1}.</span>
                    <span className="tracking-wider">{code.slice(0, 4)}-{code.slice(4)}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep("complete")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              I&apos;ve Saved My Codes
            </button>
          </div>
        )}

        
        {step === "complete" && (
          <div className="space-y-4 text-center">
            <div className="text-5xl mb-4">✓</div>
            <p className="text-lg font-semibold text-gray-900">2FA is Set Up!</p>
            <p className="text-sm text-gray-600">
              Your PKMS vault is now secured with two-factor authentication.
            </p>

            <button
              onClick={handleCompleteSetup}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Processing..." : "Complete Setup & Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
