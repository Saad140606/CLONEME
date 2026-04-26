"use client";

interface ProgressBarProps {
  value: number;
  statusText: string;
}

export default function ProgressBar({ value, statusText }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="surface-card w-full p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted">{statusText}</span>
        <span className="text-accent2">{clamped}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[#1a1a27]">
        <div
          className="h-full rounded-full bg-[length:200%_100%] bg-gradient-to-r from-accent via-accent2 to-accent animate-pulseBar transition-[width] duration-700"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
