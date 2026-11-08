const linkStyle = { color: "#8a8178" } as const;

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="transition hover:text-ha-text hover:opacity-80" style={linkStyle}>
      {children}
    </a>
  );
}

function Column({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#3d3d3d" }}>
        {title}
      </h3>
      <nav className="flex flex-col gap-2.5 text-sm">
        {links.map((l) => (
          <FooterLink key={l.label} href={l.href}>
            {l.label}
          </FooterLink>
        ))}
      </nav>
    </div>
  );
}

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Use cases", href: "/#use-cases" },
      { label: "FAQ", href: "/#faq" },
      { label: "Download", href: "/#download" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "System status", href: "/status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security", href: "/security" },
      { label: "Cookie preferences", href: "/privacy#cookies" },
    ],
  },
];

const GITHUB_URL = "https://github.com/candid-choice/candid-assist";

export default function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t" style={{ borderColor: "#e8e4de", backgroundColor: "#faf8f5" }}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand block */}
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-sm text-white"
                style={{ backgroundColor: "#7c6fa8" }}
              >
                <span style={{ fontSize: "13px" }}>✦</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: "#3d3d3d" }}>
                Human Assist
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#8a8178" }}>
              A human-in-the-loop workspace where agents work and you stay in control.
            </p>
            {/* Social */}
            <div className="mt-1 flex items-center gap-4">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="transition hover:opacity-70"
                style={{ color: "#8a8178" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.36 1.12 2.94.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 2.5-.34c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="transition hover:opacity-70"
                style={{ color: "#8a8178" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.23l-4.88-6.38L6.5 22H3.4l7.24-8.28L1.2 2h6.39l4.41 5.83L18.9 2Zm-1.1 18.1h1.72L7.5 3.8H5.65L17.8 20.1Z" />
                </svg>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Discord"
                className="transition hover:opacity-70"
                style={{ color: "#8a8178" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.8a.07.07 0 0 0-.08.04c-.2.37-.43.85-.59 1.23a18.27 18.27 0 0 0-5.47 0c-.16-.39-.4-.86-.6-1.23a.08.08 0 0 0-.08-.04A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.12 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6.03 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2.01a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08.01c.12.1.25.2.37.29a.08.08 0 0 1 0 .13c-.6.35-1.22.64-1.88.9a.08.08 0 0 0-.04.1c.36.72.77 1.39 1.22 2.02a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6.04-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.2 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Z" />
                </svg>
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <Column key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs md:flex-row"
          style={{ borderColor: "#e8e4de", color: "#8a8178" }}
        >
          <span>© {year} Candid Choice, Inc. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/contact">Support</FooterLink>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#4caf7d" }}
                aria-hidden
              />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
