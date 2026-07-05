"use client";

import React, { useEffect, useState } from "react";

type Account = { id: string; github_handle: string };
type GithubRepo = {
  id: string;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
};

type LinkedRepo = {
  id: string;
  repo_url: string;
  default_branch?: string | null;
  github_account_id: string;
  last_sync_status?: string;
};

export default function RepoPicker({ projectId }: { projectId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedGithubRepoId, setSelectedGithubRepoId] = useState<string | null>(null);
  const [linkedRepo, setLinkedRepo] = useState<LinkedRepo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchReposFor(selectedAccount);
    }
  }, [selectedAccount]);

  useEffect(() => {
    loadLinkedRepo();
  }, [projectId]);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/github-accounts", { credentials: "include" });
      const j = await res.json();
      if (res.ok && j.accounts) setAccounts(j.accounts);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchReposFor(accountId: string) {
    try {
      const res = await fetch(`/api/github-accounts/repos?githubAccountId=${accountId}`, { credentials: "include" });
      const j = await res.json();
      if (res.ok && j.repositories) setRepos(j.repositories);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadLinkedRepo() {
    try {
      const res = await fetch(`/api/repositories?projectId=${projectId}`, { credentials: "include" });
      const j = await res.json();
      if (res.ok && j.repository) setLinkedRepo(j.repository);
    } catch (err) {
      console.error(err);
    }
  }

  async function linkRepo() {
    if (!selectedAccount || !selectedGithubRepoId) return;
    setLoading(true);
    try {
      const selectedRepo = repos.find((r) => r.id === selectedGithubRepoId);
      if (!selectedRepo) {
        alert("Selected repository not found");
        return;
      }

      const res = await fetch("/api/repositories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          githubAccountId: selectedAccount,
          repoUrl: selectedRepo.html_url,
          defaultBranch: selectedRepo.default_branch,
        }),
      });

      if (res.ok) {
        const j = await res.json();
        setLinkedRepo(j.repository);
        alert("Repository linked");
      } else {
        const j = await res.json();
        alert(j.error || "Failed to link repository");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function syncSelectedRepo() {
    if (!linkedRepo?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: linkedRepo.id }),
      });

      const j = await res.json();
      if (res.ok) {
        alert("Sync completed");
      } else {
        alert(j.error || "Sync failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm">GitHub Account</label>
        <select
          className="w-full rounded border px-2 py-1"
          value={selectedAccount || ""}
          onChange={(e) => {
            const val = e.target.value || null;
            setSelectedAccount(val);
            setSelectedGithubRepoId(null);
          }}
        >
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.github_handle}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm">Repository</label>
        <select className="w-full rounded border px-2 py-1" value={selectedGithubRepoId || ""} onChange={(e) => setSelectedGithubRepoId(e.target.value || null)}>
          <option value="">Select repository</option>
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
      </div>

      {linkedRepo ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Linked repository:</p>
          <p className="font-medium">{linkedRepo.repo_url}</p>
          <p className="text-xs text-slate-500">Default branch: {linkedRepo.default_branch || "main"}</p>
        </div>
      ) : null}

      <div>
        <div className="flex gap-2">
          <button className="rounded bg-green-600 text-white px-3 py-1" onClick={linkRepo} disabled={loading || !selectedGithubRepoId}>
          {loading ? "Linking…" : "Link Repository to Project"}
          </button>
          <button className="rounded bg-blue-600 text-white px-3 py-1" onClick={syncSelectedRepo} disabled={loading || !linkedRepo?.id}>
            {loading ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
