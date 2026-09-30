const steps = [
  {
    number: "1",
    title: "Install & connect",
    description:
      "Download Human Assist and pair it with Claude Code. The app runs in the background, ready to receive surfaces at any time.",
  },
  {
    number: "2",
    title: "Claude pushes a surface",
    description:
      "When Claude needs something from you — a file to review, a confirmation, a drawing — a card appears on your desktop.",
  },
  {
    number: "3",
    title: "You respond, Claude continues",
    description:
      "Complete the surface, send your response back to Claude, and Claude resumes work — no context switching, no lost thought.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="py-20" id="how-it-works">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-medium" style={{ color: "#7c6fa8", letterSpacing: "0.5px" }}>
            HOW IT WORKS
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "#3d3d3d" }}>
            Three steps, zero friction
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div
                className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border"
                style={{ borderColor: "#e8e4de" }}
              >
                <span className="text-lg font-semibold" style={{ color: "#7c6fa8" }}>
                  {step.number}
                </span>
              </div>
              <h3 className="mb-2 text-base font-semibold" style={{ color: "#3d3d3d" }}>
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: "#8a8178", lineHeight: 1.55 }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
