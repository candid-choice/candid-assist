import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Documentation — Human Assist" };

export default function Page() {
  return (
    <SimplePage title="Documentation">
      <Section heading="Overview">
        <p>
          Getting-started guides, the desktop app manual, MCP integration reference, and
          self-hosting notes. Full docs are being written — meanwhile, the app ships with in-product
          help.
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
