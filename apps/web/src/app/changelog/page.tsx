import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Changelog — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="Changelog">
      <Section heading="Overview">
        <p>We ship frequently. Notable recent work: direct in-app chat powered by the pi agent core, session-scoped surfaces, consent-gated browsing, and the process manager. A per-release feed is coming soon.</p>
        <p>
          Questions? <a href="/contact">Contact us</a> or find us on{" "}
          <a href="https://github.com/candid-choice/candid-assist" rel="noreferrer">GitHub</a>.
        </p>
      </Section>
    </SimplePage>
  );
}
