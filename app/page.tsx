import Link from "next/link";

const steps = [
  {
    title: "Upload photo",
    description: "Add one clear reference image to define the person you want animated."
  },
  {
    title: "Upload video",
    description: "Drop in a driving clip that contains the motion and pose sequence."
  },
  {
    title: "Get result",
    description: "Our GPU backend renders and returns your generated motion video."
  }
];

const features = [
  {
    title: "Full body",
    description: "Upload mode runs MimicMotion to generate full-body animation quality results."
  },
  {
    title: "Live webcam",
    description: "Live mode uses InsightFace for near-real-time face swap at around 0.5-1s delay."
  },
  {
    title: "Powered by AI",
    description: "CUDA GPUs on Modal accelerate per-frame inference that CPUs cannot handle in real time."
  }
];

const modes = [
  {
    title: "Live Mode",
    subtitle: "face swap, instant",
    description: "Near-real-time webcam face swap using InsightFace, with around 0.5-1s delay."
  },
  {
    title: "Upload Mode",
    subtitle: "full body, 2-10 min",
    description: "High-quality full-body reenactment using MimicMotion. Best quality, slower turnaround."
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-10 md:px-10">
        <header className="flex items-center justify-between">
          <div className="font-heading text-2xl tracking-wide text-accent2">CloneMe</div>
          <nav className="flex items-center gap-3 text-sm text-muted">
            <Link className="ghost-btn px-5 py-2" href="/dashboard">
              Dashboard
            </Link>
            <Link className="primary-btn px-5 py-2" href="/generate">
              Try Free
            </Link>
          </nav>
        </header>

        <section className="relative grid gap-8 rounded-3xl border border-accent/20 bg-[#0f0f1c]/80 px-8 py-16 md:grid-cols-2 md:px-14">
          <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-accent/20 blur-[100px]" />
          <div className="absolute -right-24 bottom-10 h-56 w-56 rounded-full bg-accent2/25 blur-[100px]" />

          <div className="relative animate-fadeUp">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-accent2">AI Motion Generation</p>
            <h1 className="font-heading text-4xl leading-tight md:text-6xl">
              Animate Anyone. Instantly.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted md:text-lg">
              CloneMe turns one reference photo and one driving video into a realistic AI-animated
              performance in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="primary-btn px-7 py-3" href="/generate">
                Try Free
              </Link>
              <Link className="ghost-btn px-7 py-3" href="/generate">
                See Demo
              </Link>
            </div>
          </div>

          <div className="relative surface-card animate-fadeUp p-6 [animation-delay:180ms]">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <p className="text-sm text-muted">Expected runtime</p>
                <p className="mt-1 text-2xl font-medium text-accent2">~2-5 minutes</p>
              </div>
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div className="flex gap-3" key={step.title}>
                    <div className="mt-1 h-6 w-6 rounded-full border border-accent/50 text-center text-xs leading-6 text-accent2">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step, idx) => (
            <article
              className="surface-card animate-fadeUp p-6"
              key={step.title}
              style={{ animationDelay: `${(idx + 1) * 120}ms` }}
            >
              <p className="text-sm text-accent2">Step {idx + 1}</p>
              <h2 className="mt-2 font-heading text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.description}</p>
            </article>
          ))}
        </section>

        <section>
          <h3 className="font-heading text-3xl">Choose Your Mode</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {modes.map((mode, idx) => (
              <article
                className="surface-card animate-fadeUp p-6"
                key={mode.title}
                style={{ animationDelay: `${(idx + 1) * 140}ms` }}
              >
                <p className="text-sm uppercase tracking-[0.2em] text-accent2">{mode.subtitle}</p>
                <h4 className="mt-2 font-heading text-2xl">{mode.title}</h4>
                <p className="mt-2 text-sm text-muted">{mode.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-heading text-3xl">Features</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((feature, idx) => (
              <article
                className="surface-card animate-fadeUp p-6"
                key={feature.title}
                style={{ animationDelay: `${(idx + 1) * 140}ms` }}
              >
                <h4 className="font-heading text-2xl">{feature.title}</h4>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-accent/20 py-8 text-sm text-muted">
          <div className="flex flex-col justify-between gap-3 md:flex-row">
            <p>
              <span className="font-heading text-accent2">CloneMe</span> - AI video generation for
              creators.
            </p>
            <div className="flex gap-5">
              <Link href="/generate">Generate</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/">Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
