import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Terms of Service — Human Assist" };

export default function TermsPage() {
  return (
    <SimplePage title="Terms of Service" updated="November 2025">
      <Section heading="1. Acceptance of these terms">
        <p>
          By creating an account or using Human Assist (the “Service”), you
          agree to these Terms of Service. If you are using the Service on
          behalf of an organization, you agree on its behalf.
        </p>
      </Section>
      <Section heading="2. The Service">
        <p>
          Human Assist provides a human-in-the-loop workspace for AI agents,
          including sessions, visual surfaces, browser assistance, and direct
          chat. Features may change as the product evolves.
        </p>
      </Section>
      <Section heading="3. Your account">
        <p>
          You are responsible for maintaining the security of your credentials
          and for all activity under your account. Notify us promptly of any
          unauthorized use.
        </p>
      </Section>
      <Section heading="4. Acceptable use">
        <p>
          You may not misuse the Service: no unlawful activity, attempts to
          disrupt or reverse-engineer it beyond what law permits, or use of
          automation to harm other users.
        </p>
      </Section>
      <Section heading="5. Your content">
        <p>
          You own your content. You grant us only the limited license needed
          to operate the Service (storing, syncing, and displaying it for you).
        </p>
      </Section>
      <Section heading="6. Disclaimers">
        <p>
          The Service is provided “as is” without warranties of any kind. AI
          outputs can be wrong — always review agent actions and generated
          content before relying on them.
        </p>
      </Section>
      <Section heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Candid Choice, Inc. is not
          liable for indirect or consequential damages arising from your use of
          the Service.
        </p>
      </Section>
      <Section heading="8. Changes & termination">
        <p>
          We may modify or discontinue features and may suspend accounts that
          violate these terms. Material changes will be announced in-app or by
          email.
        </p>
      </Section>
      <Section heading="9. Contact">
        <p>
          Questions: <a href="mailto:legal@candidchoice.ai">legal@candidchoice.ai</a>.
        </p>
      </Section>
    </SimplePage>
  );
}
