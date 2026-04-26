export type JobStatus = "pending" | "processing" | "done" | "failed";
export type JobMode = "upload" | "live";

export interface JobRow {
  id: string;
  user_id: string;
  mode: JobMode;
  status: JobStatus;
  photo_url: string | null;
  video_url: string | null;
  result_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobResponse {
  status: JobStatus;
  result_url: string | null;
  created_at: string;
}
