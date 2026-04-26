import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

function resolveModalFunctionUrl(explicitUrl: string | undefined, baseUrl: string | undefined, functionName: string): string | null {
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  if (!baseUrl) {
    return null;
  }

  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  if (trimmedBaseUrl.includes(`-${functionName}.modal.run`)) {
    return trimmedBaseUrl;
  }

  if (trimmedBaseUrl.endsWith(".modal.run")) {
    return trimmedBaseUrl.replace(/\.modal\.run$/, `-${functionName}.modal.run`);
  }

  return trimmedBaseUrl;
}

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

    const modalLiveFrameUrl = resolveModalFunctionUrl(
      process.env.MODAL_LIVE_FRAME_URL,
      process.env.MODAL_API_URL,
      "live-frame"
    );
    if (!modalLiveFrameUrl) {
      return NextResponse.json({ error: "MODAL_LIVE_FRAME_URL is not configured." }, { status: 500 });
    }

    const modalResponse = await fetch(modalLiveFrameUrl.replace(/\/$/, ""), {
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
      const modalText = await modalResponse.text().catch(() => "");
      return NextResponse.json({ error: modalText || "Modal error" }, { status: 500 });
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
