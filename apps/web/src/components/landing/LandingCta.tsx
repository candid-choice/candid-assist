export default function LandingCta() {
  return (
    <section className="border-t bg-ha-surface py-20" style={{ borderColor: "#e8e4de" }}>
      <div className="mx-auto max-w-xl text-center px-6">
        <h2 className="text-3xl font-bold" style={{ color: "#3d3d3d" }}>
          Ready to work with Claude?
        </h2>
        <p className="mt-3 text-base" style={{ color: "#8a8178", lineHeight: 1.55 }}>
          Download Human Assist and let Claude push interactive surfaces directly to your desktop.
        </p>
        <button
          className="mt-6 rounded-md px-8 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "#7c6fa8", color: "#fff" }}
        >
          Download for macOS
        </button>
        <p className="mt-4 text-sm" style={{ color: "#8a8178" }}>
          Free · Open source · macOS 13+
        </p>
      </div>
    </section>
  );
}
