import Link from 'next/link';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';

export const metadata = {
  title: 'Terms of Service - KopaAlert',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Terms of Service</h1>
        <p className="mb-8 text-xs text-muted-foreground">Last updated: September 2026</p>

        <Section title="1. Acceptance of these Terms">
          <p>
            By registering for or using KopaAlert ("the Service"), you agree to be bound by these
            Terms of Service and our{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not register for or use the Service.
          </p>
        </Section>

        <Section title="2. What KopaAlert Is">
          <p>
            KopaAlert is a platform that helps businesses track customer debts, record payments, and
            send automated SMS/email payment reminders to their customers. Businesses using KopaAlert
            are responsible for the accuracy of the customer and debt information they enter.
          </p>
        </Section>

        <Section title="3. Account Registration and Approval">
          <p>
            Business accounts are reviewed and approved by KopaAlert administration before activation.
            We may decline a registration at our discretion. You must provide accurate business, owner,
            and contact information, including a real, reachable phone number and email address.
          </p>
        </Section>

        <Section title="4. Subscription and Billing">
          <p>
            New businesses start on a free tier. KopaAlert may offer paid subscription plans (a
            recurring monthly fee, defaulting to KES 1,500 unless a custom price has been agreed) for
            continued or expanded use of the Service. Payments are currently recorded manually by
            KopaAlert administration upon confirmation of payment (e.g. M-Pesa, bank transfer, or cash).
          </p>
          <p>
            If a paid subscription lapses without payment, KopaAlert may suspend ("lock") the
            business's access to the dashboard until payment is made. Your data is retained, not
            deleted, during a lock. KopaAlert may also suspend an account for violation of these Terms,
            independent of billing status.
          </p>
        </Section>

        <Section title="5. Your Responsibilities">
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide accurate information about your business and your customers.</li>
            <li>Use the Service only for legitimate debt tracking and payment reminder purposes.</li>
            <li>
              Do not use the Service to harass, threaten, or send abusive messages to customers via SMS
              or email.
            </li>
            <li>Do not attempt to circumvent security, billing, or access controls.</li>
            <li>Keep your login credentials confidential and secure.</li>
          </ul>
        </Section>

        <Section title="6. SMS and Email Communications">
          <p>
            When you use KopaAlert to send reminders, you authorize us to send SMS and/or email
            messages to the phone numbers and email addresses you provide on your behalf, using our
            shared messaging infrastructure. You are responsible for ensuring you have a lawful basis
            to contact the individuals you add as customers.
          </p>
        </Section>

        <Section title="7. Data and Privacy">
          <p>
            Our collection and use of information is described in our{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . By using the Service, you also agree to that policy.
          </p>
        </Section>

        <Section title="8. Suspension and Termination">
          <p>
            We may suspend or terminate access to the Service for violation of these Terms, non-payment
            of a due subscription, fraudulent registration information, or misuse of the platform. You
            may stop using the Service at any time; contact support to request account closure or data
            deletion.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            KopaAlert is provided "as is." We do not guarantee uninterrupted service, guaranteed
            delivery of every SMS or email, or that reminders will result in payment collection. To the
            fullest extent permitted by law, KopaAlert is not liable for indirect, incidental, or
            consequential damages arising from use of the Service.
          </p>
        </Section>

        <Section title="10. Changes to these Terms">
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes
            take effect constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms are governed by the laws of the Republic of Kenya.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            Questions about these Terms? Contact us at{' '}
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
