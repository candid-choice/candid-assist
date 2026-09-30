import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    title: "Interactive Surfaces",
    description:
      "Claude can push browser windows, drawing canvases, image annotations, and input forms directly to your desktop. Respond without switching apps.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Always Ready",
    description:
      "Human Assist stays running in the background. When Claude needs input — a confirmation, a file selection, a screenshot — it appears as a quiet card on your desktop.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    title: "Multi-Surface Support",
    description:
      "Browser views, freehand canvas, screen capture, multi-choice polls, image annotation — Claude can present any of these as interactive surfaces on your desktop.",
  },
];

export default function LandingFeatures() {
  return (
    <section className="border-t bg-ha-surface py-20" id="features" style={{ borderColor: "#e8e4de" }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-medium" style={{ color: "#7c6fa8", letterSpacing: "0.5px" }}>
            FEATURES
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "#3d3d3d" }}>
            Everything you need, nothing you don't
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="hover-lift"
              style={{ backgroundColor: "#faf7f2", borderColor: "#e8e4de", borderWidth: 1 }}
            >
              <CardContent className="flex flex-col gap-3 px-6 pt-6" style={{ paddingBottom: "24px" }}>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md"
                  style={{ backgroundColor: "#7c6fa8" }}
                >
                  {feature.icon}
                </div>
                <div>
                  <h3 className="mb-2 text-base font-semibold" style={{ color: "#3d3d3d" }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm" style={{ color: "#8a8178", lineHeight: 1.55 }}>
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
