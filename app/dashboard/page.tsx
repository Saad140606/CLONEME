"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JobTable from "../../components/JobTable";
import { getBrowserSupabaseClient } from "../../lib/supabase";
import type { JobRow } from "../../lib/types";

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
}

function getCooldownRemaining(key: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) {
    return 0;
  }

  const expiresAt = Number(storedValue);
  if (!Number.isFinite(expiresAt)) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export default function DashboardPage() {
  const supabase = getBrowserSupabaseClient();
  const cooldownKey = "cloneme-magic-link-cooldown-dashboard";

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [magicLinkCooldown, setMagicLinkCooldown] = useState(0);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("id,user_id,mode,status,photo_url,video_url,result_url,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setJobs([]);
    } else {
      setJobs((data ?? []) as JobRow[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const hasAuth = Boolean(data.session);
      setIsAuthenticated(hasAuth);
      if (hasAuth) {
        fetchJobs();
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasAuth = Boolean(session);
      setIsAuthenticated(hasAuth);
      if (hasAuth) {
        fetchJobs();
      } else {
        setJobs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    setMagicLinkCooldown(getCooldownRemaining(cooldownKey));

    const interval = window.setInterval(() => {
      setMagicLinkCooldown(getCooldownRemaining(cooldownKey));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownKey]);

  const signIn = async () => {
    if (magicLinkCooldown > 0 || isSendingMagicLink) {
      return;
    }

    setMessage(null);
    setIsSendingMagicLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getAppUrl()}/dashboard`
      }
    });

    if (error) {
      if (error.status === 429) {
        const retryAfterSeconds = 60;
        const expiresAt = Date.now() + retryAfterSeconds * 1000;
        window.localStorage.setItem(cooldownKey, String(expiresAt));
        setMagicLinkCooldown(retryAfterSeconds);
        setMessage("Too many magic-link requests. Please wait 60 seconds and try again.");
      } else {
        setMessage(error.message);
      }
      setIsSendingMagicLink(false);
      return;
    }

    setMessage("Magic link sent. Check your inbox.");
    const retryAfterSeconds = 60;
    const expiresAt = Date.now() + retryAfterSeconds * 1000;
    window.localStorage.setItem(cooldownKey, String(expiresAt));
    setMagicLinkCooldown(retryAfterSeconds);
    setIsSendingMagicLink(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMessage("Signed out.");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl">Your Jobs</h1>
        <div className="flex gap-3">
          <Link className="ghost-btn px-4 py-2 text-sm" href="/generate">
            Generate New
          </Link>
          {isAuthenticated ? (
            <button className="ghost-btn px-4 py-2 text-sm" onClick={signOut} type="button">
              Sign Out
            </button>
          ) : null}
        </div>
      </div>

      {!isAuthenticated ? (
        <section className="surface-card mb-6 p-6">
          <h2 className="font-heading text-2xl">Sign in with magic link</h2>
          <p className="mt-2 text-sm text-muted">Authentication is required to access your history.</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              className="w-full rounded-xl border border-accent/30 bg-[#131322] px-4 py-3 text-sm outline-none focus:border-accent"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
            <button className="primary-btn px-5 py-3" onClick={signIn} type="button">
              {isSendingMagicLink
                ? "Sending..."
                : magicLinkCooldown > 0
                  ? `Wait ${magicLinkCooldown}s`
                  : "Send Magic Link"}
            </button>
          </div>
        </section>
      ) : null}

      {message ? <p className="mb-4 text-sm text-muted">{message}</p> : null}

      {isAuthenticated && isLoading ? (
        <div className="surface-card p-6 text-sm text-muted">Loading jobs...</div>
      ) : null}

      {isAuthenticated && !isLoading ? <JobTable jobs={jobs} /> : null}
    </main>
  );
}
