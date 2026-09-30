export default function LandingFooter() {
  return (
    <footer className="border-t py-8" style={{ borderColor: "#e8e4de" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 md:flex-row md:justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-sm text-white"
            style={{ backgroundColor: "#7c6fa8" }}
          >
            <span style={{ fontSize: "12px" }}>✦</span>
          </div>
          <span className="text-sm font-medium" style={{ color: "#3d3d3d" }}>
            Human Assist
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm">
          <a href="#features" className="hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            Features
          </a>
          <a href="#use-cases" className="hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            Use cases
          </a>
          <a href="#faq" className="hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            FAQ
          </a>
          <span style={{ color: "#8a8178" }}>@ 2026</span>
        </div>
      </div>
    </footer>
  );
}
