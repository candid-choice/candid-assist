import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Careers — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="Careers">
      <Section heading="Overview">
        <p>We are a small team building the human side of AI. No open roles right now — send speculative applications to careers@candidchoice.ai.</p>
        <p>
          Questions? <a href="/contact">Contact us</a> or find us on{" "}
          <a href="https://github.com/candid-choice/candid-assist" rel="noreferrer">GitHub</a>.
        </p>
      </Section>
    </SimplePage>
  );
}
