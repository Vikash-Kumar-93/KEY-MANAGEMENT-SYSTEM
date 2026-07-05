import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import { createProject, createProjectDataKeyRecord, getProjectsForUser } from "@/lib/db/projects";
import { createProjectDataKey } from "@/lib/crypto/envelope";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const projects = await getProjectsForUser(userId);
    return NextResponse.json({ success: true, projects }, { status: 200 });
  } catch (error: any) {
    console.error("List projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const body = await request.json();
    const { projectName, notes } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: "Missing projectName" },
        { status: 400 }
      );
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const project = await createProject(userId, projectName, notes || null);
    const { wrappedKey, keyIv, keyAuthTag } = createProjectDataKey(masterKey);

    await createProjectDataKeyRecord(
      project.id,
      userId,
      wrappedKey,
      keyIv,
      keyAuthTag
    );

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error: any) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
});
