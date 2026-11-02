import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Security — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="Security">
      <Section heading="Overview">
        <p>Security is core to the product design: agent actions are consent-gated, browser automation pauses for human handoff, credentials stay in the desktop keychain, and no data is shared without your approval. Report vulnerabilities to security@candidchoice.ai.</p>
        <p>
          Questions? <a href="/contact">Contact us</a> or find us on{" "}
          <a href="https://github.com/candid-choice/candid-assist" rel="noreferrer">GitHub</a>.
        </p>
      </Section>
    </SimplePage>
  );
}
