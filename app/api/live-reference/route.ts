import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseServiceClient } from "../../../lib/supabase";

function getPhotoExt(file: File): "jpg" | "png" {
  return file.type.includes("png") ? "png" : "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = getServerSupabaseServiceClient();

    const form = await request.formData();
    const photo = form.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "Missing photo" }, { status: 400 });
    }

    if (!["image/jpeg", "image/png"].includes(photo.type)) {
      return NextResponse.json({ error: "Only jpg/png supported." }, { status: 400 });
    }

    const path = `public/live/${Date.now()}-reference.${getPhotoExt(photo)}`;
    const upload = await serviceClient.storage.from("uploads").upload(path, photo, {
      upsert: false,
      contentType: photo.type
    });

    if (upload.error) {
      if (upload.error.message?.toLowerCase().includes("bucket") || upload.error.message?.includes("not found")) {
        return NextResponse.json(
          {
            error:
              "Supabase storage buckets are not set up yet. Create uploads (private) and results (public) from supabase/schema.sql instructions."
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const signed = await serviceClient.storage.from("uploads").createSignedUrl(path, 60 * 60);
    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json({ error: signed.error?.message ?? "Failed to sign reference URL." }, { status: 500 });
    }

    return NextResponse.json({ referenceUrl: signed.data.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
