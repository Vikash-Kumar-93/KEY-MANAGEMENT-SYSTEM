"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">PKMS</h1>
        <p className="text-xl text-gray-600 mb-8">
          Project & Key Management System
        </p>
        <p className="text-gray-500 mb-8">
          Secure vault for managing projects and secrets
        </p>
        <div className="space-x-4">
          <Link href="/auth/signup">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Sign Up
            </button>
          </Link>
          <Link href="/auth/login">
            <button className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
