"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FileUpload from "../../components/FileUpload";
import LiveWebcam from "../../components/LiveWebcam";
import ProgressBar from "../../components/ProgressBar";
import VideoResult from "../../components/VideoResult";
import { getBrowserSupabaseClient } from "../../lib/supabase";
import type { JobResponse, JobStatus } from "../../lib/types";

type GenerateMode = "upload" | "live";

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
}

export default function GeneratePage() {
  const supabase = getBrowserSupabaseClient();

  const [mode, setMode] = useState<GenerateMode>("upload");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [emailForLogin, setEmailForLogin] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [liveReferenceUrl, setLiveReferenceUrl] = useState<string | null>(null);
  const [liveReferenceError, setLiveReferenceError] = useState<string | null>(null);
  const [isPreparingLiveReference, setIsPreparingLiveReference] = useState(false);
  const [livePreparedPhotoKey, setLivePreparedPhotoKey] = useState<string | null>(null);

  const processingTickRef = useRef<number>(0);

  const photoKey = photoFile ? `${photoFile.name}-${photoFile.size}-${photoFile.lastModified}` : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const interval = setInterval(async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setErrorMessage("You were signed out. Please sign in again.");
        clearInterval(interval);
        return;
      }

      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        setErrorMessage("Could not fetch job status.");
        clearInterval(interval);
        return;
      }

      const payload = (await response.json()) as JobResponse;
      setStatus(payload.status);

      if (payload.status === "pending") {
        setProgress(20);
      } else if (payload.status === "processing") {
        processingTickRef.current += 1;
        setProgress(Math.min(90, 35 + processingTickRef.current * 8));
      } else if (payload.status === "done") {
        setProgress(100);
        setResultUrl(payload.result_url);
        clearInterval(interval);
      } else if (payload.status === "failed") {
        setErrorMessage("Generation failed. Please try another input pair.");
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, supabase.auth]);

  useEffect(() => {
    if (!photoKey || photoKey !== livePreparedPhotoKey) {
      setLiveReferenceUrl(null);
    }
  }, [livePreparedPhotoKey, photoKey]);

  const canGenerate = useMemo(() => Boolean(photoFile && videoFile && hasSession), [photoFile, videoFile, hasSession]);

  const canPrepareLiveReference = useMemo(
    () => Boolean(photoFile && hasSession && photoKey && photoKey !== livePreparedPhotoKey),
    [hasSession, livePreparedPhotoKey, photoFile, photoKey]
  );

  const signInWithMagicLink = async () => {
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: emailForLogin,
      options: {
        emailRedirectTo: `${getAppUrl()}/generate`
      }
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage("Check your email for a magic login link.");
  };

  const handleGenerate = async () => {
    if (!photoFile || !videoFile) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultUrl(null);
    setStatus("pending");
    setProgress(10);
    processingTickRef.current = 0;

    const sessionResponse = await supabase.auth.getSession();
    const token = sessionResponse.data.session?.access_token;

    if (!token) {
      setErrorMessage("You need to sign in first.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("video", videoFile);

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      setErrorMessage(errorData.error ?? "Failed to create generation job.");
      setIsSubmitting(false);
      return;
    }

    const payload = (await response.json()) as { jobId: string };
    setJobId(payload.jobId);
    setIsSubmitting(false);
  };

  const handlePrepareLiveReference = async () => {
    if (!photoFile) {
      setLiveReferenceError("Upload a reference photo first.");
      return;
    }

    const sessionResponse = await supabase.auth.getSession();
    const token = sessionResponse.data.session?.access_token;

    if (!token) {
      setLiveReferenceError("You need to sign in first.");
      return;
    }

    setLiveReferenceError(null);
    setIsPreparingLiveReference(true);

    const formData = new FormData();
    formData.append("photo", photoFile);

    const response = await fetch("/api/live-reference", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      setLiveReferenceError(errorData.error ?? "Failed to prepare reference photo for live mode.");
      setIsPreparingLiveReference(false);
      return;
    }

    const payload = (await response.json()) as { referenceUrl: string };
    setLiveReferenceUrl(payload.referenceUrl);
    setLivePreparedPhotoKey(photoKey);
    setIsPreparingLiveReference(false);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-4xl">Generate Animation</h1>
        <Link className="ghost-btn px-4 py-2 text-sm" href="/dashboard">
          Open Dashboard
        </Link>
      </div>

      <div className="mb-6 inline-flex rounded-full border border-accent/30 bg-[#121221] p-1">
        <button
          className={`rounded-full px-5 py-2 text-sm transition ${
            mode === "upload" ? "bg-accent text-white" : "text-muted hover:text-text"
          }`}
          onClick={() => setMode("upload")}
          type="button"
        >
          Upload Video
        </button>
        <button
          className={`rounded-full px-5 py-2 text-sm transition ${
            mode === "live" ? "bg-accent text-white" : "text-muted hover:text-text"
          }`}
          onClick={() => setMode("live")}
          type="button"
        >
          Live Webcam
        </button>
      </div>

      {!hasSession ? (
        <section className="surface-card mb-8 p-6">
          <h2 className="font-heading text-2xl">Sign in to start</h2>
          <p className="mt-2 text-sm text-muted">Use an email magic link for secure access.</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              className="w-full rounded-xl border border-accent/30 bg-[#131322] px-4 py-3 text-sm outline-none focus:border-accent"
              onChange={(event) => setEmailForLogin(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={emailForLogin}
            />
            <button className="primary-btn px-5 py-3" onClick={signInWithMagicLink} type="button">
              Send Magic Link
            </button>
          </div>
        </section>
      ) : null}

      {errorMessage ? <p className="mb-4 text-sm text-red-300">{errorMessage}</p> : null}

      {mode === "upload" ? (
        <>
          <p className="mb-4 text-sm text-muted">Estimated wait time: ~2-10 minutes</p>

          <section className="grid gap-5 md:grid-cols-2">
            <FileUpload
              accept="image/jpeg,image/png"
              file={photoFile}
              label="Reference Photo"
              onFileChange={setPhotoFile}
            />
            <FileUpload
              accept="video/mp4,video/webm"
              file={videoFile}
              label="Driving Video"
              onFileChange={setVideoFile}
            />
          </section>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              className="primary-btn px-7 py-3"
              disabled={!canGenerate || isSubmitting}
              onClick={handleGenerate}
              type="button"
            >
              {isSubmitting ? "Starting..." : "Generate"}
            </button>
            {jobId ? <span className="text-sm text-muted">Job ID: {jobId}</span> : null}
          </div>

          {status ? (
            <div className="mt-6">
              <ProgressBar statusText={`Status: ${status}`} value={progress} />
            </div>
          ) : null}

          {resultUrl ? (
            <div className="mt-6">
              <VideoResult resultUrl={resultUrl} />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="mb-5 rounded-xl border border-accent/25 bg-[#121221] p-4 text-sm text-muted">
            Live mode swaps your face in real time (~0.5-1s delay). For full body animation, use Upload Mode.
          </div>

          <div className="mb-5">
            <FileUpload
              accept="image/jpeg,image/png"
              file={photoFile}
              label="Reference Photo"
              onFileChange={setPhotoFile}
            />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              className="primary-btn px-6 py-2.5"
              disabled={!canPrepareLiveReference || isPreparingLiveReference}
              onClick={handlePrepareLiveReference}
              type="button"
            >
              {isPreparingLiveReference ? "Preparing..." : "Prepare Reference for Live"}
            </button>
            <span className="text-sm text-muted">
              {liveReferenceUrl ? "Reference ready for live processing." : "Prepare once before starting live mode."}
            </span>
          </div>

          {liveReferenceError ? <p className="mb-4 text-sm text-red-300">{liveReferenceError}</p> : null}

          <LiveWebcam referencePhotoUrl={liveReferenceUrl} />
        </>
      )}
    </main>
  );
}
