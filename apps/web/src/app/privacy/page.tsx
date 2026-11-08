import SimplePage, { Section } from "@/components/SimplePage";

export const metadata = { title: "Privacy Policy — Human Assist" };

export default function PrivacyPage() {
  return (
    <SimplePage title="Privacy Policy" updated="November 2025">
      <Section heading="1. Information we collect">
        <p>
          We collect the account information you provide when you register (email address, display
          name) and basic profile details from third-party sign-in providers if you use them.
        </p>
        <p>
          Your workspace content — sessions, surfaces, agent interactions, and chat transcripts — is
          associated with your account so it can sync across your devices.
        </p>
      </Section>
      <Section heading="2. How we use information">
        <p>
          To authenticate you, sync your workspace, deliver the desktop and web apps, respond to
          support requests, and improve reliability. We do not sell personal information.
        </p>
      </Section>
      <Section heading="3. AI & third-party services">
        <p>
          Prompts you send and content you choose to share may be transmitted to the model providers
          you configure (for example, your own inference endpoint or a hosted AI provider). Their
          terms and privacy policies govern that processing.
        </p>
      </Section>
      <Section heading="4. Cookies & local storage">
        <p>
          The web app uses browser localStorage and IndexedDB to keep you signed in and preserve
          your workspace between visits. No third-party advertising cookies are used.
        </p>
      </Section>
      <Section heading="5. Data retention & deletion">
        <p>
          You can delete any session (and its chat) at any time from the app. Deleting your account
          removes your profile and workspace data within 30 days.
        </p>
      </Section>
      <Section heading="6. Your rights">
        <p>
          Depending on your jurisdiction you may request access, correction, or deletion of your
          personal data. Email <a href="mailto:privacy@candidchoice.ai">privacy@candidchoice.ai</a>{" "}
          to exercise these rights.
        </p>
      </Section>
      <Section heading="7. Contact">
        <p>
          Questions? Reach us at{" "}
          <a href="mailto:privacy@candidchoice.ai">privacy@candidchoice.ai</a> or via{" "}
          <a href="/contact">the contact page</a>.
        </p>
      </Section>
    </SimplePage>
  );
}
