import Link from "next/link";
import JobTable from "../../components/JobTable";
import { getServerSupabaseServiceClient } from "../../lib/supabase";
import type { JobRow } from "../../lib/types";

export default async function DashboardPage() {
  const supabase = getServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id,user_id,mode,status,photo_url,video_url,result_url,created_at,updated_at")
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as JobRow[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl">Job History</h1>
        <Link className="ghost-btn px-4 py-2 text-sm" href="/generate">
          Generate New
        </Link>
      </div>

      <p className="mb-4 text-sm text-muted">Public view for now. All generated jobs are listed below.</p>

      {error ? <p className="mb-4 text-sm text-red-300">{error.message}</p> : null}

      <JobTable jobs={jobs} />
    </main>
  );
}