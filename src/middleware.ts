import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const backendUrl = process.env.API_BASE_URL || "";

  // Add ngrok header when backend is behind ngrok
  if (backendUrl.includes("ngrok")) {
    const headers = new Headers(req.headers);
    headers.set("ngrok-skip-browser-warning", "true");
    return NextResponse.rewrite(req.url, { request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/backend/:path*",
};
