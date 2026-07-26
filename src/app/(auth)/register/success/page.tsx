export default function RegistrationSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-lg border border-slate-200 p-10 text-center">

        <div className="text-7xl mb-6">
          ✅
        </div>

        <h1 className="text-3xl font-bold text-slate-900">
          Registration Submitted
        </h1>

        <p className="mt-6 text-slate-700 leading-8">

          Thank you for registering your business with
          <span className="font-semibold"> KopaAlert</span>.

          <br /><br />

          📄 Your application has been received successfully.

          <br /><br />

          ⏳ Your registration is currently awaiting review by a Super Administrator.

          <br /><br />

          📧 Once approved, you'll receive your login credentials through your configured notification channel (email and/or SMS).

          <br /><br />

          🔒 For security reasons, you cannot sign in until your account has been approved.

          <br /><br />

          Thank you for your patience.
        </p>

        <div className="mt-10 rounded-lg bg-slate-50 border border-slate-200 p-4">

          <p className="text-slate-600 font-medium">
            ✔ You may now safely close this browser tab.
          </p>

        </div>

      </div>
    </main>
  );
}