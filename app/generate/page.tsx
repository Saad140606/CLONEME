"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FileUpload from "../../components/FileUpload";
import LiveWebcam from "../../components/LiveWebcam";
import ProgressBar from "../../components/ProgressBar";
import VideoResult from "../../components/VideoResult";
import type { JobResponse, JobStatus } from "../../lib/types";

type GenerateMode = "upload" | "live";

export default function GeneratePage() {
  const [mode, setMode] = useState<GenerateMode>("upload");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveReferenceUrl, setLiveReferenceUrl] = useState<string | null>(null);
  const [liveReferenceError, setLiveReferenceError] = useState<string | null>(null);
  const [isPreparingLiveReference, setIsPreparingLiveReference] = useState(false);
  const [livePreparedPhotoKey, setLivePreparedPhotoKey] = useState<string | null>(null);

  const processingTickRef = useRef<number>(0);

  const photoKey = photoFile ? `${photoFile.name}-${photoFile.size}-${photoFile.lastModified}` : null;
  const estimatedTotalSeconds = mode === "upload" ? 600 : 2;
  const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);

  useEffect(() => {
    if (!startedAt || !jobId || status === "done" || status === "failed") {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [jobId, startedAt, status]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const interval = setInterval(async () => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          "Content-Type": "application/json"
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
        setProgress((current) => Math.max(current, 20));
      } else if (payload.status === "processing") {
        processingTickRef.current += 1;
        setProgress((current) => Math.min(98, Math.max(current, 35 + processingTickRef.current * 6)));
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
  }, [jobId]);

  useEffect(() => {
    if (!photoKey || photoKey !== livePreparedPhotoKey) {
      setLiveReferenceUrl(null);
    }
  }, [livePreparedPhotoKey, photoKey]);

  const canGenerate = useMemo(() => Boolean(photoFile && videoFile), [photoFile, videoFile]);

  const canPrepareLiveReference = useMemo(
    () => Boolean(photoFile && photoKey && photoKey !== livePreparedPhotoKey),
    [livePreparedPhotoKey, photoFile, photoKey]
  );

  const handleGenerate = async () => {
    if (!photoFile || !videoFile) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultUrl(null);
    setStatus("pending");
    setProgress(10);
    setStartedAt(Date.now());
    setElapsedSeconds(0);
    processingTickRef.current = 0;

    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("video", videoFile);

    const response = await fetch("/api/generate", {
      method: "POST",
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

    setLiveReferenceError(null);
    setIsPreparingLiveReference(true);

    const formData = new FormData();
    formData.append("photo", photoFile);

    const response = await fetch("/api/live-reference", {
      method: "POST",
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                <span>Estimated remaining: {new Date(remainingSeconds * 1000).toISOString().slice(14, 19)}</span>
                <span>
                  {mode === "upload" ? "Upload mode usually takes 2-10 minutes." : "Live mode runs every ~500ms."}
                </span>
              </div>
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
