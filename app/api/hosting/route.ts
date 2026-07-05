import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getHosting, saveHosting } from "@/lib/db/hosting";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const hosting = await getHosting(projectId, userId);
    return NextResponse.json({ success: true, hosting }, { status: 200 });
  } catch (error: unknown) {
    console.error("Hosting fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch hosting" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const body = await request.json();
    const { projectId, host_type, vercel_url, vps_host, vps_sso_login_url, notes } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const hosting = await saveHosting(projectId, userId, {
      host_type,
      vercel_url,
      vps_host,
      vps_sso_login_url,
      notes,
    });

    return NextResponse.json({ success: true, hosting }, { status: 200 });
  } catch (error: unknown) {
    console.error("Hosting save error:", error);
    return NextResponse.json({ error: "Failed to save hosting" }, { status: 500 });
  }
});
