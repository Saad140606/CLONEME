import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseServiceClient } from "../../../../lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const serviceClient = getServerSupabaseServiceClient();

  const query = await serviceClient
    .from("jobs")
    .select("status,result_url,created_at")
    .eq("id", params.jobId)
    .single();

  if (query.error || !query.data) {
    if (query.error?.code === "PGRST205") {
      return NextResponse.json(
        {
          error:
            "Supabase schema is not applied yet. Create the public.jobs table and storage buckets from supabase/schema.sql."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(query.data);
}
