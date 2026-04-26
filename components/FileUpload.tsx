"use client";

import { useMemo, useState } from "react";

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export default function FileUpload({ label, accept, file, onFileChange }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  const isVideo = file?.type.startsWith("video/");

  return (
    <label
      className={`surface-card flex min-h-72 cursor-pointer flex-col justify-between rounded-2xl border-2 border-dashed p-5 transition ${
        isDragging
          ? "border-accent bg-accent/10"
          : "border-accent/30 hover:border-accent/70 hover:bg-[#161627]"
      }`}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const dropped = event.dataTransfer.files?.[0] ?? null;
        onFileChange(dropped);
      }}
    >
      <div>
        <p className="font-heading text-2xl">{label}</p>
        <p className="mt-2 text-sm text-muted">Drag and drop, or click to browse</p>
      </div>

      {file && previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-accent/30">
          {isVideo ? (
            <video className="h-44 w-full object-cover" controls src={previewUrl} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Reference preview" className="h-44 w-full object-cover" src={previewUrl} />
          )}
          <p className="truncate bg-[#121221] px-3 py-2 text-xs text-muted">{file.name}</p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-accent/20 bg-[#121221] px-4 py-6 text-center text-sm text-muted">
          Accepts: {accept}
        </div>
      )}

      <input
        accept={accept}
        className="hidden"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        type="file"
      />
    </label>
  );
}
