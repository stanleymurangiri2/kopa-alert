import Link from 'next/link';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';

export const metadata = {
  title: 'Privacy Policy - KopaAlert',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-8 text-xs text-muted-foreground">Last updated: September 2026</p>

        <Section title="1. Scope">
          <p>
            This Privacy Policy explains how KopaAlert ("we", "us") collects, uses, and protects
            information when businesses ("you", "the business") use the Service, and information about
            businesses' own customers ("debtors") that businesses enter into the platform.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Business account information:</strong> business
              name, owner name, phone number, email address, and login credentials.
            </li>
            <li>
              <strong className="text-foreground">Customer (debtor) information:</strong> names, phone
              numbers, debt amounts, due dates, and payment history that businesses enter about their
              own customers. This data is entered and controlled by the business, not by KopaAlert.
            </li>
            <li>
              <strong className="text-foreground">Billing information:</strong> subscription tier,
              price, payment records (amount, method, reference), recorded by KopaAlert administration.
            </li>
            <li>
              <strong className="text-foreground">Usage and audit data:</strong> login activity and
              administrative actions taken within the platform, for security and support purposes.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Information">
          <ul className="list-disc space-y-1 pl-5">
            <li>To operate the Service: managing accounts, customers, debts, and payments.</li>
            <li>
              To send SMS and email reminders on a business's behalf to the phone numbers/emails the
              business provides.
            </li>
            <li>To bill businesses for paid subscriptions and send invoices/receipts.</li>
            <li>To communicate with businesses about their account, approvals, or support requests.</li>
            <li>To maintain security, prevent fraud, and enforce our Terms of Service.</li>
          </ul>
        </Section>

        <Section title="4. Who We Share Information With">
          <p>We share information only as needed to operate the Service:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Africa's Talking</strong> - our SMS gateway provider,
              to deliver reminder messages.
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> - our email provider, to deliver
              account and billing emails.
            </li>
            <li>
              <strong className="text-foreground">Supabase</strong> - our database and authentication
              infrastructure provider, which stores platform data securely.
            </li>
          </ul>
          <p>We do not sell business or customer data to third parties.</p>
        </Section>

        <Section title="5. Cookies">
          <p>
            KopaAlert uses cookies required to keep you signed in and to operate the platform securely.
            We do not currently use cookies for advertising or third-party tracking.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain account and customer data for as long as a business account is active. If a
            business account is permanently deleted (by request or by KopaAlert administration),
            associated customer, debt, payment, and notification records are deleted along with it.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>
            Businesses may request access to, correction of, or deletion of their account data by
            contacting support. Individuals whose information was entered by a business as a customer
            (debtor) should first contact that business directly, as the business controls that data;
            KopaAlert can assist upon a business's request.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use industry-standard measures (encrypted connections, access controls, and role-based
            permissions) to protect data. No system is completely secure, and we encourage businesses to
            keep login credentials confidential.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            KopaAlert is intended for business use and is not directed at children. We do not knowingly
            collect information from children.
          </p>
        </Section>

        <Section title="10. Changes to this Policy">
          <p>
            We may update this Privacy Policy from time to time. Continued use of the Service after
            changes take effect constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            Questions about this Privacy Policy? Contact us at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            or {SUPPORT_PHONE}.
          </p>
        </Section>

        <div className="mt-8 border-t border-border pt-4 text-center">
          <Link href="/register" className="text-sm font-medium text-primary hover:underline">
            Back to Registration
          </Link>
        </div>
      </div>
    </main>
  );
}
