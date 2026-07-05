import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { updateProject, deleteProject } from "@/lib/db/projects";

export const PATCH = withAuth(async (request: NextRequest, { params }: { params: { projectId: string } }) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const body = await request.json();
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const { name, notes } = body;
    if (!name && notes === undefined) {
      return NextResponse.json({ error: "Missing update fields" }, { status: 400 });
    }

    const updatedProject = await updateProject(projectId, userId, name, notes);
    return NextResponse.json({ success: true, project: updatedProject }, { status: 200 });
  } catch (error: any) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { projectId: string } }) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    await deleteProject(projectId, userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
});
