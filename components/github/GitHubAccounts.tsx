"use client";

import React, { useEffect, useState } from "react";

type Account = {
  id: string;
  github_handle: string;
  profile_url?: string | null;
  created_at?: string;
};

export default function GitHubAccounts(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ githubHandle: "", profileUrl: "", accessToken: "" });

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/github-accounts", { credentials: "include" });
      const json = await res.json();
      if (res.ok && json.accounts) setAccounts(json.accounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/github-accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubHandle: form.githubHandle,
          profileUrl: form.profileUrl,
          accessToken: form.accessToken,
        }),
      });

      if (res.ok) {
        setForm({ githubHandle: "", profileUrl: "", accessToken: "" });
        await fetchAccounts();
      } else {
        const j = await res.json();
        alert(j.error || "Failed to create account");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-medium">Add GitHub Account</h2>
        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
          <div>
            <label className="block text-sm">GitHub Handle</label>
            <input
              className="w-full rounded border px-2 py-1"
              value={form.githubHandle}
              onChange={(e) => setForm({ ...form, githubHandle: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm">Profile URL (optional)</label>
            <input
              className="w-full rounded border px-2 py-1"
              value={form.profileUrl}
              onChange={(e) => setForm({ ...form, profileUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Personal Access Token</label>
            <input
              className="w-full rounded border px-2 py-1"
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              required
            />
          </div>
          <div>
            <button className="rounded bg-blue-600 text-white px-3 py-1" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Account"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">Your GitHub Accounts</h2>
        {loading ? (
          <p>Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No accounts added yet.</p>
        ) : (
          <ul className="space-y-2 mt-2">
            {accounts.map((a) => (
              <li key={a.id} className="rounded border p-2">
                <div className="font-medium">{a.github_handle}</div>
                <div className="text-sm text-gray-600">{a.profile_url}</div>
                <div className="text-xs text-gray-400">{a.created_at}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
