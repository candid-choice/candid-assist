import Link from "next/link";

/** SimplePage — shared shell for footer/utility pages (privacy, terms, …). */
export default function SimplePage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#faf8f5", color: "#3d3d3d" }}>
      {/* Minimal header */}
      <header className="border-b" style={{ borderColor: "#e8e4de", backgroundColor: "#fff" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-sm text-white"
              style={{ backgroundColor: "#7c6fa8" }}
            >
              ✦
            </span>
            <span className="text-sm font-semibold">Human Assist</span>
          </Link>
          <Link
            href="/"
            className="text-sm transition hover:opacity-70"
            style={{ color: "#8a8178" }}
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm" style={{ color: "#8a8178" }}>
            Last updated: {updated}
          </p>
        )}
        <div className="mt-8 space-y-6 text-sm leading-relaxed [&_a]:underline">{children}</div>
        <footer
          className="mt-14 border-t pt-6 text-xs"
          style={{ borderColor: "#e8e4de", color: "#8a8178" }}
        >
          © {new Date().getFullYear()} Candid Choice, Inc. · <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/terms">Terms</Link> · <Link href="/contact">Contact</Link>
        </footer>
      </article>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
