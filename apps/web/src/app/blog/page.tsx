import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Blog — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="Blog">
      <Section heading="Overview">
        <p>
          Essays on human-in-the-loop AI, agent UX, and building trustworthy automation. First posts
          are on the way.
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
