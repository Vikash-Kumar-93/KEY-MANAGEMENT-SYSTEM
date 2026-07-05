import { NextRequest, NextResponse } from "next/server";
import { getSessionMetadata } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "No session" },
        { status: 401 }
      );
    }

    const sessionMetadata = getSessionMetadata(sessionId);

    if (!sessionMetadata) {
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        userId: sessionMetadata.userId,
        deviceId: sessionMetadata.deviceId,
        createdAt: sessionMetadata.createdAt,
        lastActivityAt: sessionMetadata.lastActivityAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Session check error:", error);

    return NextResponse.json(
      { error: "Session check failed" },
      { status: 500 }
    );
  }
}
