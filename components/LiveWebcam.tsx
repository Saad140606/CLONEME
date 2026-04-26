"use client";

/*
  LIVE MODE TECHNICAL REALITY:
  - Face swap per frame: works, ~200-500ms per frame on T4 GPU
  - Full body reenactment per frame: too slow (~30s per frame), not suitable for live
  - So live mode does FACE SWAP only (fast)
  - Upload mode does FULL BODY reenactment (slow but high quality)
  - Tell users this difference clearly in the UI
*/

import { useCallback, useEffect, useRef, useState } from "react";

interface LiveWebcamProps {
  referencePhotoUrl: string | null;
}

type LiveStatus = "idle" | "connecting" | "processing" | "error";

export default function LiveWebcam({ referencePhotoUrl }: LiveWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inFlightRef = useRef(false);
  const frameCount = useRef(0);
  const lastFpsTime = useRef(Date.now());

  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [lagMs, setLagMs] = useState(0);
  const [lastFrameAgeMs, setLastFrameAgeMs] = useState<number | null>(null);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopWebcamTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 512, height: 512, facingMode: "user" },
      audio: false
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !captureCanvasRef.current || !referencePhotoUrl || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    const startedAt = Date.now();

    try {
      const canvas = captureCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("2D context not available.");
      }

      canvas.width = 512;
      canvas.height = 512;
      ctx.drawImage(videoRef.current, 0, 0, 512, 512);

      const frameBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not encode frame."));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.7
        );
      });

      setStatus("processing");

      const formData = new FormData();
      formData.append("frame", frameBlob, "frame.jpg");
      formData.append("reference_url", referencePhotoUrl);

      const response = await fetch("/api/live-frame", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Live frame request failed.");
      }

      const processedBlob = await response.blob();
      const objectUrl = URL.createObjectURL(processedBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => {
          const outCtx = outputRef.current?.getContext("2d");
          if (outCtx && outputRef.current) {
            outputRef.current.width = 512;
            outputRef.current.height = 512;
            outCtx.drawImage(image, 0, 0, 512, 512);
          }
          URL.revokeObjectURL(objectUrl);
          resolve();
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not render processed frame."));
        };

        image.src = objectUrl;
      });

      const now = Date.now();
      setLagMs(now - startedAt);
      setLastFrameAgeMs(0);
      frameCount.current += 1;

      if (now - lastFpsTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastFpsTime.current = now;
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown live processing error.");
    } finally {
      inFlightRef.current = false;
    }
  }, [referencePhotoUrl]);

  const handleStart = useCallback(async () => {
    if (!referencePhotoUrl) {
      setError("Upload and prepare a reference photo first.");
      return;
    }

    setError(null);
    setStatus("connecting");

    try {
      await startWebcam();
      setIsRunning(true);
      intervalRef.current = setInterval(processFrame, 500);
      setStatus("processing");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not access webcam.");
      stopWebcamTracks();
    }
  }, [processFrame, referencePhotoUrl, startWebcam, stopWebcamTracks]);

  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsRunning(false);
    setStatus("idle");
    setFps(0);
    setLagMs(0);
    setLastFrameAgeMs(null);
    inFlightRef.current = false;
    stopWebcamTracks();
  }, [stopWebcamTracks]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      timer = setInterval(() => {
        setLastFrameAgeMs((current) => {
          if (current === null) {
            return null;
          }
          return current + 200;
        });
      }, 200);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopWebcamTracks();
    };
  }, [stopWebcamTracks]);

  const statusClass =
    status === "processing"
      ? "bg-green-400"
      : status === "connecting"
        ? "bg-yellow-400"
        : status === "error"
          ? "bg-red-400"
          : "bg-gray-500";

  return (
    <div className="surface-card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-[#131322] px-3 py-1.5 text-muted">
          <span className={`h-2.5 w-2.5 rounded-full ${statusClass} ${status !== "idle" ? "animate-pulse" : ""}`} />
          {status === "processing" ? "Processing" : status === "connecting" ? "Connecting" : status === "error" ? "Error" : "Idle"}
        </span>
        <span className="rounded-full border border-accent/30 bg-[#131322] px-3 py-1.5 text-muted">{fps} fps</span>
        <span className="rounded-full border border-accent/30 bg-[#131322] px-3 py-1.5 text-muted">
          Last frame: {lastFrameAgeMs === null ? "-" : `${(lastFrameAgeMs / 1000).toFixed(1)}s ago`}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-accent/30 bg-[#13131c]">
          <video ref={videoRef} className="h-full w-full scale-x-[-1] object-cover" muted playsInline />
          <canvas ref={captureCanvasRef} className="hidden" />
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">You</div>
        </div>

        <div className="relative aspect-square overflow-hidden rounded-2xl border border-accent/30 bg-[#13131c]">
          <canvas ref={outputRef} className="h-full w-full object-cover" />
          {!isRunning ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">Output appears here</div>
          ) : null}
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">Clone</div>
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-accent2">{fps} fps</div>
          <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-accent2">~1s delay - processing on GPU</div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Processing on GPU. Expect 0.5-2 second delay per frame. This is near-real-time, not true real-time.
      </p>

      <div className="mt-4 rounded-xl border border-accent/25 bg-[#121221] p-4 text-sm text-muted">
        Live mode swaps your face in real time. Upload mode animates your full body and takes about 2-5 minutes.
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <button
        className={`mt-5 w-full rounded-full py-3 font-medium text-white transition-all ${
          isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
        }`}
        onClick={isRunning ? handleStop : handleStart}
        type="button"
      >
        {isRunning ? "Stop" : "Start Live"}
      </button>
    </div>
  );
}
