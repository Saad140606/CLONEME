import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const frame = form.get("frame");
    const referenceUrl = form.get("reference_url");

    if (!(frame instanceof File) || typeof referenceUrl !== "string" || !referenceUrl) {
      return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
    }

    const frameBytes = new Uint8Array(await frame.arrayBuffer());
    const frameB64 = Buffer.from(frameBytes).toString("base64");

    const modalBase = process.env.MODAL_API_URL;
    if (!modalBase) {
      return NextResponse.json({ error: "MODAL_API_URL is not configured." }, { status: 500 });
    }

    const modalResponse = await fetch(`${modalBase.replace(/\/$/, "")}/live-frame`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        frame_b64: frameB64,
        reference_url: referenceUrl
      })
    });

    if (!modalResponse.ok) {
      return NextResponse.json({ error: "Modal error" }, { status: 500 });
    }

    const payload = (await modalResponse.json()) as { frame_b64?: string };
    if (!payload.frame_b64) {
      return NextResponse.json({ error: "Invalid response from Modal live endpoint." }, { status: 500 });
    }

    const outputBuffer = Buffer.from(payload.frame_b64, "base64");
    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "image/jpeg"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
