import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseServiceClient } from "../../../lib/supabase";

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

function getMimeExtension(file: File, fallback: string): string {
  if (file.type.includes("png")) {
    return "png";
  }
  if (file.type.includes("jpeg") || file.type.includes("jpg")) {
    return "jpg";
  }
  if (file.type.includes("webm")) {
    return "webm";
  }
  if (file.type.includes("mp4")) {
    return "mp4";
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = getServerSupabaseServiceClient();

    const formData = await request.formData();
    const photo = formData.get("photo");
    const video = formData.get("video");

    if (!(photo instanceof File) || !(video instanceof File)) {
      return NextResponse.json({ error: "Both photo and video are required." }, { status: 400 });
    }

    const validPhoto = ["image/jpeg", "image/png"].includes(photo.type);
    const validVideo = ["video/mp4", "video/webm"].includes(video.type);

    if (!validPhoto || !validVideo) {
      return NextResponse.json({ error: "Invalid file types." }, { status: 400 });
    }

    const now = Date.now();
    const photoPath = `public/${now}-photo.${getMimeExtension(photo, "jpg")}`;
    const videoPath = `public/${now}-video.${getMimeExtension(video, "mp4")}`;

    const uploadedPhoto = await serviceClient.storage.from("uploads").upload(photoPath, photo, {
      contentType: photo.type,
      upsert: false
    });

    if (uploadedPhoto.error) {
      return NextResponse.json({ error: uploadedPhoto.error.message }, { status: 500 });
    }

    const uploadedVideo = await serviceClient.storage.from("uploads").upload(videoPath, video, {
      contentType: video.type,
      upsert: false
    });

    if (uploadedVideo.error) {
      return NextResponse.json({ error: uploadedVideo.error.message }, { status: 500 });
    }

    const createdJob = await serviceClient
      .from("jobs")
      .insert({
        mode: "upload",
        status: "pending",
        photo_url: photoPath,
        video_url: videoPath
      })
      .select("id")
      .single();

    if (createdJob.error || !createdJob.data) {
      if (createdJob.error?.code === "PGRST205") {
        return NextResponse.json(
          {
            error:
              "Supabase schema is not applied yet. Create the public.jobs table and storage buckets from supabase/schema.sql."
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: createdJob.error?.message ?? "Failed to create job" }, { status: 500 });
    }

    const jobId = createdJob.data.id as string;

    const photoSigned = await serviceClient.storage.from("uploads").createSignedUrl(photoPath, 60 * 30);
    const videoSigned = await serviceClient.storage.from("uploads").createSignedUrl(videoPath, 60 * 30);

    if (photoSigned.error || videoSigned.error) {
      await serviceClient
        .from("jobs")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", jobId);

      return NextResponse.json({ error: "Failed to create signed URLs for uploaded files." }, { status: 500 });
    }

    const modalGenerateUrl = resolveModalFunctionUrl(
      process.env.MODAL_GENERATE_URL,
      process.env.MODAL_API_URL,
      "generate"
    );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!modalGenerateUrl || !appUrl) {
      return NextResponse.json(
        { error: "MODAL_GENERATE_URL and NEXT_PUBLIC_APP_URL must be configured." },
        { status: 500 }
      );
    }

    const modalResponse = await fetch(modalGenerateUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        job_id: jobId,
        photo_url: photoSigned.data.signedUrl,
        video_url: videoSigned.data.signedUrl,
        webhook_url: `${appUrl.replace(/\/$/, "")}/api/webhook`
      })
    });

    if (!modalResponse.ok) {
      await serviceClient
        .from("jobs")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", jobId);

      return NextResponse.json({ error: "Could not dispatch job to GPU backend." }, { status: 502 });
    }

    await serviceClient
      .from("jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return NextResponse.json({ jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
