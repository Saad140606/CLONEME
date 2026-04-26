import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabaseAnonClient,
  getServerSupabaseServiceClient
} from "../../../../lib/supabase";

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anonClient = getServerSupabaseAnonClient();
  const serviceClient = getServerSupabaseServiceClient();

  const userResponse = await anonClient.auth.getUser(token);
  const user = userResponse.data.user;

  if (!user) {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }

  const query = await serviceClient
    .from("jobs")
    .select("status,result_url,created_at")
    .eq("id", params.jobId)
    .eq("user_id", user.id)
    .single();

  if (query.error || !query.data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(query.data);
}
