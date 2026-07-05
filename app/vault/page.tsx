"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RepoPicker from "@/components/github/RepoPicker";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

type Secret = {
  id: string;
  project_id: string;
  owner_user_id: string;
  label: string;
  category: string | null;
  env_var_name: string | null;
  ciphertext: string;
  secret_iv: string;
  secret_auth_tag: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  rotated_at: string | null;
};

export default function VaultPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""
  );
  const [projectName, setProjectName] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [secretLabel, setSecretLabel] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [revealSecretId, setRevealSecretId] = useState<string | null>(null);
  const [revealedText, setRevealedText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch("/api/auth/session", {
      credentials: "include",
    });
      if (!response.ok) {
        router.push("/auth/login");
        return;
      }

      await loadProjects();
    };

    fetchSession();
  }, [router]);

  useEffect(() => {
    if (selectedProjectId) {
      loadSecrets(selectedProjectId);
    } else {
      setSecrets([]);
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to load projects");
      }

      const data = await response.json();
      setProjects(data.projects || []);
      setSelectedProjectId(data.projects?.[0]?.id || null);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function loadSecrets(projectId: string) {
    try {
      const response = await fetch(`/api/secrets?projectId=${encodeURIComponent(projectId)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to load secrets");
      }

      const data = await response.json();
      setSecrets(data.secrets || []);
    } catch (err: any) {
      setError(err.message || "Failed to load secrets");
      setSecrets([]);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/auth/login");
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, notes: projectNotes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      const data = await response.json();
      setProjects((current) => [data.project, ...current]);
      setSelectedProjectId(data.project.id);
      setProjectName("");
      setProjectNotes("");
    } catch (err: any) {
      setError(err.message || "Project creation failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Select a project first.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/secrets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          name: secretLabel,
          value: secretValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create secret");
      }

      await loadSecrets(selectedProjectId);
      setSecretLabel("");
      setSecretValue("");
    } catch (err: any) {
      setError(err.message || "Secret creation failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevealSecret(secretId: string) {
    setActionLoading(true);
    setError("");
    setRevealSecretId(secretId);

    try {
      const response = await fetch(`/api/secrets/${secretId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reveal secret");
      }

      const data = await response.json();
      setRevealedText(data.secret.plaintext || "");
    } catch (err: any) {
      setError(err.message || "Unable to reveal secret");
      setRevealedText("");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">PKMS Vault</h1>
            <p className="text-sm text-slate-500">Manage encrypted projects and secrets.</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Lock Vault
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a project and pick one to manage secrets.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {projects.length} projects
                </span>
              </div>

              <form onSubmit={handleCreateProject} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Project name</label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My First Project"
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    placeholder="Optional project description"
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Create Project
                </button>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-slate-900">Project list</h3>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading projects…</p>
                ) : projects.length === 0 ? (
                  <p className="text-sm text-slate-500">No projects yet.</p>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedProjectId === project.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">{project.name}</span>
                        <span className="text-xs text-slate-500">{new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                      {project.notes ? (
                        <p className="mt-2 text-sm text-slate-500">{project.notes}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Secrets</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add secrets to the selected project and reveal them securely.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedProject ? selectedProject.name : "No project selected"}
                  </span>
                  <Link href="/settings/github-accounts" className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700">
                    Manage GitHub Accounts
                  </Link>
                </div>
              </div>

              <form onSubmit={handleCreateSecret} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Secret label</label>
                  <input
                    value={secretLabel}
                    onChange={(e) => setSecretLabel(e.target.value)}
                    placeholder="Database password"
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Secret value</label>
                  <input
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder="••••••••••"
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedProjectId}
                  className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Store Secret
                </button>
              </form>
            </div>

            {selectedProjectId ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm border mt-6">
                <h3 className="text-lg font-semibold text-slate-900">GitHub Integration</h3>
                <p className="mt-1 text-sm text-slate-500">Link repositories or sync with GitHub for the selected project.</p>
                <div className="mt-4">
                  <RepoPicker projectId={selectedProjectId} />
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl bg-white p-6 shadow-sm border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Secret list</h3>
                  <p className="mt-1 text-sm text-slate-500">Select a secret and reveal its plaintext securely.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {secrets.length} secrets
                </span>
              </div>

              {selectedProjectId ? (
                <div className="mt-5 space-y-3">
                  {secrets.length === 0 ? (
                    <p className="text-sm text-slate-500">No secrets for this project yet.</p>
                  ) : (
                    secrets.map((secret) => (
                      <div
                        key={secret.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{secret.label}</p>
                            <p className="mt-1 text-xs text-slate-500">Source: {secret.source || "manual"}</p>
                          </div>
                          <button
                            onClick={() => handleRevealSecret(secret.id)}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Reveal
                          </button>
                        </div>
                        {revealSecretId === secret.id && revealedText ? (
                          <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-800 border border-blue-100">
                            <strong>Plaintext:</strong> {revealedText}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Choose a project to load secrets.</p>
              )}
            </div>
          </section>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
