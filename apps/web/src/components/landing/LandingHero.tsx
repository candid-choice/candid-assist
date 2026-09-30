export default function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
      <div className="max-w-2xl">
        {/* Label */}
        <p className="mb-4 text-sm font-medium" style={{ color: "#7c6fa8", letterSpacing: "0.5px" }}>
          HUMAN ASSIST — macOS DESKTOP APP
        </p>

        {/* Headline */}
        <h1 className="mt-0 text-4xl leading-tight md:text-5xl" style={{ color: "#3d3d3d", fontWeight: 700 }}>
          A workspace for you
          <br /> and Claude to work together
        </h1>

        {/* Description */}
        <p className="mt-4 text-base" style={{ color: "#8a8178", lineHeight: 1.65 }}>
          Human Assist turns your screen into a shared workspace. Claude Code can push interactive surfaces — webviews, canvas drawing,
          input forms — directly to your desktop. You respond. Claude continues. No copy-paste, no alt-tab, no waiting.
        </p>

        {/* CTA */}
        <div className="mt-8 flex items-center gap-4">
          <button
            className="rounded-md px-6 py-2.5 text-sm font-medium"
            style={{ backgroundColor: "#7c6fa8", color: "#fff" }}
          >
            Download for macOS
          </button>
          <span className="text-sm" style={{ color: "#8a8178" }}>
            Free · Open source · macOS 13+
          </span>
        </div>

        {/* App screenshot mockup */}
        <div className="mt-16 overflow-hidden rounded-xl" style={{ borderColor: "#e8e4de", backgroundColor: "#faf7f2", boxShadow: "0 8px 32px rgba(60, 50, 40, 0.06)" }}>
          {/* macOS title bar */}
          <div className="flex items-center gap-3 border-b bg-white px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#ff7b72" }}></div>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#ff9f0a" }}></div>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#34c759" }}></div>
            </div>
            <span className="text-sm" style={{ color: "#8a8178" }}>Human Assist</span>
          </div>

          {/* Fake UI content */}
          <div className="px-8 py-10 text-center">
            {/* Icon */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border" style={{ backgroundColor: "#f0eef6", borderColor: "#e6e2f2" }}>
              <span className="text-ha-primary" style={{ fontSize: "26px" }}>✦</span>
            </div>
            <p className="mt-4 text-base font-semibold" style={{ color: "#3d3d3d" }}>
              Waiting for Claude
            </p>
            <p className="mt-2 text-sm" style={{ color: "#8a8178" }}>
              Claude Code will reach out when it needs your help
            </p>
            <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5" style={{ backgroundColor: "#f0f7f1", borderColor: "#dce8df" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#6b9e78" }}></span>
              <span className="text-xs font-medium" style={{ color: "#6b9e78" }}>Connected via MCP</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
