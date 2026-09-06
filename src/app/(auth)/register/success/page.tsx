export default function RegistrationSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-xl bg-card shadow-lg border border-border p-10 text-center">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-foreground">
          Your Application Has Been Submitted
        </h1>

        <p className="mt-4 text-muted-foreground leading-7">
          Thank you for registering your business with KopaAlert.
        </p>

        <div className="mt-8 space-y-4 text-left">

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              1
            </div>
            <p className="text-foreground">
              A KopaAlert administrator will review your application.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              2
            </div>
            <p className="text-foreground">
              Once approved, your login details will be sent to the email address you provided.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              3
            </div>
            <p className="text-foreground">
              You can then log in and start managing your customers, debts, and payments.
            </p>
          </div>

        </div>

        <div className="mt-8 rounded-lg bg-warning/10 border border-warning/30 p-4 text-left">
          <p className="text-sm text-warning">
            <strong>Tip:</strong> Please check your spam or junk folder if you don't see our email within a day of approval.
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-muted border border-border p-4 text-left">
          <p className="text-sm text-muted-foreground">
            You cannot log in until your account is approved. You may safely close this page — you don't need to keep it open.
          </p>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Questions? Contact us at{' '}
          <a href="mailto:solutiontechcampany@gmail.com" className="font-medium text-primary hover:underline">
            solutiontechcampany@gmail.com
          </a>
          {' '}or{' '}
          <a href="tel:+254740305253" className="font-medium text-primary hover:underline">
            +254 740 305253
          </a>
        </p>

      </div>
    </main>
  );
}