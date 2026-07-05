import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/auth/db";

export async function POST(request: NextRequest) {
  try {
    
    const sessionId = request.cookies.get("sessionId")?.value;
    const userId = request.headers.get("x-user-id"); 

    if (sessionId) {
      destroySession(sessionId);
    }


    if (userId) {
      await writeAuditLog(userId, "logout");
    }

    
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    response.cookies.set("sessionId", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
