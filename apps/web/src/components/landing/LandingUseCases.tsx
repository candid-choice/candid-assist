import { Card, CardContent } from "@/components/ui/card";

const useCases = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
      </svg>
    ),
    title: "Web browsing & verification",
    description:
      "Claude can open a browser view to verify a URL, check a website, or confirm a deployment status — then come back with findings.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18" />
        <path d="M3 8h18" />
        <path d="M3 16h18" />
      </svg>
    ),
    title: "Quick polls & confirmations",
    description:
      "Claude presents a question with options directly on your desktop. You pick, and Claude proceeds. No more 'Please type Y or N' in the terminal.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M1 1l22 22" />
        <path d="M19 19l-3-3" />
      </svg>
    ),
    title: "Screen capture & annotations",
    description:
      "Claude can ask for a screenshot or screen region capture. You draw, annotate, or highlight — and send it back directly.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c.6 0 1 .4 1 1v14c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1V5c0-.6.4-1 1-1z" />
        <path d="M8 10h4" />
        <path d="M8 14h8" />
      </svg>
    ),
    title: "Freehand canvas & sketches",
    description:
      "Draw diagrams, sketch layouts, or doodle ideas on a shared canvas that Claude can see and respond to in real time.",
  },
];

export default function LandingUseCases() {
  return (
    <section className="border-t bg-ha-surface py-20" id="use-cases" style={{ borderColor: "#e8e4de" }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-medium" style={{ color: "#7c6fa8", letterSpacing: "0.5px" }}>
            USE CASES
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "#3d3d3d" }}>
            What Claude can ask you to do
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {useCases.map((useCase, i) => (
            <div key={i} className="rounded-xl border p-6 hover-lift" style={{ borderColor: "#e8e4de", backgroundColor: "#faf7f2" }}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "#f0eef6" }}>
                  <span className="text-ha-primary">{useCase.icon}</span>
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold" style={{ color: "#3d3d3d" }}>
                    {useCase.title}
                  </h3>
                  <p className="text-sm" style={{ color: "#8a8178", lineHeight: 1.55 }}>
                    {useCase.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
