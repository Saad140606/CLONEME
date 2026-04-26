"use client";

interface VideoResultProps {
  resultUrl: string;
}

export default function VideoResult({ resultUrl }: VideoResultProps) {
  return (
    <section className="surface-card p-5">
      <h3 className="font-heading text-2xl">Result</h3>
      <div className="mt-4 overflow-hidden rounded-xl border border-accent/25">
        <video className="w-full" controls src={resultUrl} />
      </div>
      <a
        className="primary-btn mt-4 inline-flex px-5 py-2.5"
        download
        href={resultUrl}
        rel="noreferrer"
        target="_blank"
      >
        Download Video
      </a>
    </section>
  );
}
