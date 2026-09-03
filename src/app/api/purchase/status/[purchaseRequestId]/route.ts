import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ purchaseRequestId: string }> },
) {
  try {
    const { purchaseRequestId } = await params;
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ detail: "Session is required." }, { status: 400 });
    }
    const response = await fetch(
      `http://localhost:8000/api/purchase/status/${purchaseRequestId}?session_id=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "BACKEND_CONNECTION_FAILED";
    return NextResponse.json({ success: false, detail: message }, { status: 502 });
  }
}
