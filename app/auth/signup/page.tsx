"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);


  const checkPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (pwd.length >= 20) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = checkPasswordStrength(passphrase);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500", "bg-emerald-500"];

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match");
      return;
    }

    if (passphrase.length < 12) {
      setError("Passphrase must be at least 12 characters");
      return;
    }

    if (!/[A-Z]/.test(passphrase)) {
      setError("Passphrase must contain at least one uppercase letter");
      return;
    }

    if (!/[a-z]/.test(passphrase)) {
      setError("Passphrase must contain at least one lowercase letter");
      return;
    }

    if (!/[0-9]/.test(passphrase)) {
      setError("Passphrase must contain at least one digit");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to continue");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passphrase }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("userId", data.userId);
      sessionStorage.setItem("setupData", JSON.stringify(data.setupData));

      router.push("/auth/setup-2fa");
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          PKMS
        </h1>
        <p className="text-center text-gray-600 text-sm mb-8">
          Create your secure vault
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Master Passphrase
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Must have: 12+ chars, uppercase, lowercase, number
            </p>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 text-sm"
              >
                {showPassphrase ? "Hide" : "Show"}
              </button>
            </div>

            {passphrase && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${
                        i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Strength: {strengthLabels[passwordStrength]}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Passphrase
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 text-sm"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-blue-600"
              required
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-5">
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>


        <div className="my-6 border-t border-gray-300" />

        <p className="text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
