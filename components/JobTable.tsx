"use client";

import type { JobRow } from "../lib/types";

interface JobTableProps {
  jobs: JobRow[];
}

const statusClasses: Record<JobRow["status"], string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  processing: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  done: "bg-green-500/20 text-green-300 border-green-400/30",
  failed: "bg-red-500/20 text-red-300 border-red-400/30"
};

export default function JobTable({ jobs }: JobTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="surface-card p-6 text-center text-sm text-muted">
        No jobs yet. Create your first animation on the Generate page.
      </div>
    );
  }

  return (
    <div className="surface-card overflow-x-auto p-2">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Download</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr className="border-t border-accent/10" key={job.id}>
              <td className="px-4 py-3">{new Date(job.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 capitalize text-accent2">{job.mode}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses[job.status]}`}>
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {job.result_url ? (
                  <a className="text-accent2 underline" href={job.result_url} rel="noreferrer" target="_blank">
                    Download
                  </a>
                ) : (
                  <span className="text-muted">Unavailable</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
