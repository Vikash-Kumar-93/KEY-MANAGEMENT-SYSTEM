import { NextRequest, NextResponse } from "next/server";
import { getMasterKey, getSessionMetadata } from "@/lib/auth/session";

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

export function withAuth<Args extends unknown[]>(
  handler: (req: NextRequest, ...args: Args) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: Args) => {
    const sessionId = request.cookies.get("sessionId")?.value;


    if (!sessionId) {
      return NextResponse.json(
        { error: "Unauthorized: No session" },
        { status: 401 }
      );
    }

    const sessionMetadata = getSessionMetadata(sessionId);

    if (process.env.NODE_ENV !== "production") {
      console.debug("withAuth: sessionId=", sessionId, "sessionMetadata=", sessionMetadata);
    }

    if (!sessionMetadata) {
      return NextResponse.json(
        { error: "Unauthorized: Session expired or invalid" },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
      const cookies = request.cookies.getAll();
      if (cookies.length > 0) {
        const rawCookie = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        requestHeaders.set("cookie", rawCookie);
        if (process.env.NODE_ENV !== "production") {
          console.debug("withAuth: rebuilt cookie header from request.cookies", rawCookie);
        }
      }
    }

    requestHeaders.set("x-user-id", sessionMetadata.userId);
    requestHeaders.set("x-session-id", sessionId);
    requestHeaders.set("x-device-id", sessionMetadata.deviceId);

    const init: NextRequestInit = {
      headers: requestHeaders,
      method: request.method,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        const bodyText = await request.text();
        if (bodyText) init.body = bodyText;
      } catch {

      }
    }

    const newRequest = new NextRequest(request.url, init);

    return handler(newRequest, ...args);
  };
}


export function getMasterKeyFromRequest(
  sessionId: string,
  userId: string
): Buffer | null {
  return getMasterKey(sessionId, userId);
}


export function authMiddleware(request: NextRequest) {

  const publicRoutes = [
    "/auth/login",
    "/auth/signup",
    "/auth/setup-2fa",
    "/auth/verify-otp",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/setup-2fa/confirm",
    "/api/auth/unlock",
    "/api/auth/session",
    "/api/auth/logout",
    "/",
  ];

  const pathname = request.nextUrl.pathname;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }


  const sessionId = request.cookies.get("sessionId")?.value;

  if (!sessionId) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const sessionMetadata = getSessionMetadata(sessionId);

  if (!sessionMetadata) {

    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}
