import { Button } from "@/components/ui/button";

export default function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-ha-surface/80 backdrop-blur-md" style={{ borderColor: "#e8e4de" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: "#7c6fa8" }}
          >
            <span style={{ fontSize: "16px" }}>✦</span>
          </div>
          <span className="text-base font-semibold" style={{ color: "#3d3d3d" }}>Human Assist</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            Features
          </a>
          <a href="#how-it-works" className="text-sm hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            How it works
          </a>
          <a href="#use-cases" className="text-sm hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            Use cases
          </a>
          <a href="#faq" className="text-sm hover:text-ha-text transition" style={{ color: "#8a8178" }}>
            FAQ
          </a>
        </div>

        {/* CTA button */}
        <Button className="rounded-md" style={{ backgroundColor: "#7c6fa8", color: "#fff", fontSize: "13px", fontWeight: 500 }}>
          Download for macOS
        </Button>
      </div>
    </nav>
  );
}
