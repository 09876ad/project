import Link from "next/link";
import Background from "@/components/Background";
import { HandCoins, ShieldCheck, Users } from "lucide-react";

const features = [
  {
    icon: HandCoins,
    title: "Transparent cooperative pricing",
    description:
      "Every job is split in the open: 80% to the worker, 10% to the welfare fund, 10% platform fee.",
  },
  {
    icon: ShieldCheck,
    title: "Verified, insured workers",
    description:
      "Every worker is reviewed by the cooperative board and covered by insurance before taking jobs.",
  },
  {
    icon: Users,
    title: "Owned by its members",
    description:
      "Workers vote on cooperative decisions, from minimum wages to welfare coverage.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <span className="text-xl font-bold text-white">Skill Link</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-700 hover:to-purple-700"
            >
              Get started
            </Link>
          </nav>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
          <span className="mb-6 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
            Worker-owned service marketplace
          </span>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Fair work. Verified hands.{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Shared prosperity.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Book trusted plumbers, electricians and cleaners. Every rupee is
            split transparently, and a slice of every job builds the workers&apos;
            own welfare fund.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:from-indigo-700 hover:to-purple-700"
            >
              Book a service
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/20 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-lg transition hover:bg-white/20"
            >
              Join as a worker
            </Link>
          </div>

          <div className="mt-16 grid w-full max-w-5xl gap-6 text-left sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
                <p className="text-sm leading-relaxed text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="px-6 py-8 text-center text-xs text-white/50 sm:px-10">
          © 2026 Skill Link. A cooperative-owned gig platform.
        </footer>
      </div>
    </div>
  );
}
