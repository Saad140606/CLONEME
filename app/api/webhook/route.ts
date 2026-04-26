import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseServiceClient } from "../../../lib/supabase";

interface WebhookPayload {
  job_id?: string;
  jobId?: string;
  result_url?: string;
  resultUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as WebhookPayload;
  const jobId = payload.job_id ?? payload.jobId;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
  }

  const serviceClient = getServerSupabaseServiceClient();

  const update = payload.error
    ? {
        status: "failed",
        updated_at: new Date().toISOString()
      }
    : {
        status: "done",
        result_url: payload.result_url ?? payload.resultUrl ?? null,
        updated_at: new Date().toISOString()
      };

  const response = await serviceClient.from("jobs").update(update).eq("id", jobId);

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
