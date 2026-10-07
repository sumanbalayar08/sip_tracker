import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: real verification happens in requireSession().
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sip_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico)$).*)"],
};
