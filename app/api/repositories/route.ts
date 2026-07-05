import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { createRepository, getRepositoriesForAccount, getRepositoryByProjectId } from "@/lib/db/github";
import { getProjectById } from "@/lib/db/projects";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const githubAccountId = request.nextUrl.searchParams.get("githubAccountId");
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (projectId) {
      const repo = await getRepositoryByProjectId(projectId);
      return NextResponse.json({ success: true, repository: repo }, { status: 200 });
    }

    if (!githubAccountId) {
      return NextResponse.json({ success: true, repositories: [] }, { status: 200 });
    }

    const repos = await getRepositoriesForAccount(githubAccountId);
    return NextResponse.json({ success: true, repositories: repos }, { status: 200 });
  } catch (error: any) {
    console.error("List repositories error:", error);
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const body = await request.json();
    const { projectId, githubAccountId, repoUrl, defaultBranch } = body;

    if (!projectId || !githubAccountId || !repoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Enforce that the project belongs to the authenticated user (server-side RLS check)
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.owner_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden: not project owner" }, { status: 403 });
    }

    const repo = await createRepository(projectId, githubAccountId, repoUrl, defaultBranch);
    return NextResponse.json({ success: true, repository: repo }, { status: 201 });
  } catch (error: any) {
    console.error("Create repository error:", error);
    return NextResponse.json({ error: "Failed to create repository" }, { status: 500 });
  }
});
 
