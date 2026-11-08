import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Roadmap — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="Roadmap">
      <Section heading="Overview">
        <p>
          Next up: per-domain consent expiry and audit log, circuit/E-CAD preview surfaces, live
          webdev preview, and team workspaces. Priorities are driven by user feedback — tell us what
          matters.
        </p>
        <p>
          Questions? <a href="/contact">Contact us</a> or find us on{" "}
          <a href="https://github.com/candid-choice/candid-assist" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </Section>
    </SimplePage>
  );
}
