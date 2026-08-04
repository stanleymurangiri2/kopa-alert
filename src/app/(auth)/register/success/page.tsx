export default function RegistrationSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-lg border border-slate-200 p-10 text-center">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-900">
          Your Application Has Been Submitted
        </h1>

        <p className="mt-4 text-slate-600 leading-7">
          Thank you for registering your business with KopaAlert.
        </p>

        <div className="mt-8 space-y-4 text-left">

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              1
            </div>
            <p className="text-slate-700">
              A KopaAlert administrator will review your application.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              2
            </div>
            <p className="text-slate-700">
              Once approved, your login details will be sent to the email address you provided.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              3
            </div>
            <p className="text-slate-700">
              You can then log in and start managing your customers, debts, and payments.
            </p>
          </div>

        </div>

        <div className="mt-8 rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
          <p className="text-sm text-amber-800">
            <strong>Tip:</strong> Please check your spam or junk folder if you don't see our email within a day of approval.
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-left">
          <p className="text-sm text-slate-600">
            You cannot log in until your account is approved. You may safely close this page — you don't need to keep it open.
          </p>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Questions? Contact us at{' '}
          <a href="mailto:solutiontechcampany@gmail.com" className="font-medium text-blue-600 hover:underline">
            solutiontechcampany@gmail.com
          </a>
          {' '}or{' '}
          <a href="tel:+254740305253" className="font-medium text-blue-600 hover:underline">
            +254 740 305253
          </a>
        </p>

      </div>
    </main>
  );
}