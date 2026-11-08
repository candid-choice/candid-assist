import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Contact — Human Assist" };

export default function ContactPage() {
  return (
    <SimplePage title="Contact us" updated="November 2025">
      <Section heading="Support">
        <p>
          Email: <a href="mailto:support@candidchoice.ai">support@candidchoice.ai</a> — we aim to
          reply within one business day.
        </p>
      </Section>
      <Section heading="Privacy & legal">
        <p>
          Privacy: <a href="mailto:privacy@candidchoice.ai">privacy@candidchoice.ai</a> · Legal:{" "}
          <a href="mailto:legal@candidchoice.ai">legal@candidchoice.ai</a>
        </p>
      </Section>
      <Section heading="Open source">
        <p>
          Found a bug or have a feature request? Open an issue on{" "}
          <a href="https://github.com/candid-choice/candid-assist" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </Section>
    </SimplePage>
  );
}
