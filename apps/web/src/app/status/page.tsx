import SimplePage, { Section } from "@/components/SimplePage";

const services = [
  { name: "Web app", note: "candidchoice.ai" },
  { name: "API & sync", note: "sessions, surfaces, profiles" },
  { name: "Accounts & sign-in", note: "registration, login" },
  { name: "Desktop app updates", note: "signed release feed" },
];

export const metadata = { title: "System status — Human Assist" };

export default function StatusPage() {
  return (
    <SimplePage title="System status" updated="November 2025">
      <Section heading="All services">
        <ul className="space-y-2">
          {services.map((s) => (
            <li key={s.name} className="flex items-center justify-between rounded-md border border-[#e8e4de] bg-white px-4 py-3">
              <span>
                <span className="font-medium">{s.name}</span>{" "}
                <span className="text-xs" style={{ color: "#8a8178" }}>— {s.note}</span>
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: "#2e7d57" }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#4caf7d" }} />
                Operational
              </span>
            </li>
          ))}
        </ul>
        <p className="pt-2" style={{ color: "#8a8178" }}>
          Incident history will appear here. For urgent reports use{" "}
          <a href="/contact">contact</a>.
        </p>
      </Section>
    </SimplePage>
  );
}
