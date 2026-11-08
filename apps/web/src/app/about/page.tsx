import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "About Human Assist — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="About Human Assist">
      <Section heading="Overview">
        <p>
          Human Assist is built by Candid Choice to keep humans in the loop with AI agents: you
          approve, steer, and see everything the agent does.
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
