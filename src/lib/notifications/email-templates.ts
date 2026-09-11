const LOGO_HEADER = `<div style="text-align:center; margin-bottom:16px;"><img src="https://www.kopaalert.shop/logo.png" width="56" height="56" alt="KopaAlert" style="border-radius:12px;" /></div>`;

export function invitationEmail(params: {
  name: string;
  business_name: string;
  role: string;
  login_email: string;
  temporary_password: string;
  login_url: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">You've been added to ${params.business_name} on KopaAlert</h2>
      <p>Hi ${params.name},</p>
      <p>You've been added as a <strong>${params.role.replace('_', ' ')}</strong> for "<strong>${params.business_name}</strong>" on KopaAlert.</p>
      <p><strong>Login Email:</strong> ${params.login_email}</p>
      <p><strong>Temporary Password:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.temporary_password}</code></p>
      <p style="color:#b91c1c; font-size: 14px;">For your security, please log in and change this password immediately.</p>
      <p><a href="${params.login_url}" style="color: #2563eb;">Log in here</a></p>
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>— The KopaAlert Team</p>
    </div>
  `;
}

export function superAdminInvitationEmail(params: {
  name: string;
  login_email: string;
  temporary_password: string;
  login_url: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">You've been granted KopaAlert Super Admin access</h2>
      <p>Hi ${params.name},</p>
      <p>
        You've been given a <strong>Super Administrator</strong> account on KopaAlert, with full
        access to every business, the platform settings, and administrative tools.
      </p>
      <p><strong>Login Email:</strong> ${params.login_email}</p>
      <p><strong>Temporary Password:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.temporary_password}</code></p>
      <p style="color:#b91c1c; font-size: 14px;">
        For your security, please log in and change this password immediately. Keep these
        credentials confidential - this account has full platform access.
      </p>
      <p><a href="${params.login_url}" style="color: #2563eb;">Log in here</a></p>
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>— The KopaAlert Team</p>
    </div>
  `;
}

export function approvalEmail(params: {
  owner_name: string;
  business_name: string;
  business_code: string;
  temporary_password: string;
  login_url: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">Your KopaAlert Business Account is Approved!</h2>
      <p>Hi ${params.owner_name},</p>
      <p>Great news! Your business "<strong>${params.business_name}</strong>" has been approved on KopaAlert.</p>
      <p><strong>Business Code:</strong> ${params.business_code}</p>
      <p><strong>Temporary Password:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.temporary_password}</code></p>
      <p style="color:#b91c1c; font-size: 14px;">For your security, please log in and change this password immediately.</p>
      <p><a href="${params.login_url}" style="color: #2563eb;">Log in here</a></p>
      <p>You can now log in and start managing customers, debts, and payments.</p>
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>— The KopaAlert Team</p>
    </div>
  `;
}

export function rejectionEmail(params: {
  owner_name: string;
  business_name: string;
  reason: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #dc2626;">Update on Your KopaAlert Business Registration</h2>
      <p>Hi ${params.owner_name},</p>
      <p>Thank you for registering "<strong>${params.business_name}</strong>" with KopaAlert.</p>
      <p>After review, we're unable to approve this registration at this time.</p>
      <p><strong>Reason:</strong> ${params.reason}</p>
      <p>You're welcome to reach out if you'd like clarification or wish to reapply.</p>
      <hr />
      <p>Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>— The KopaAlert Team</p>
    </div>
  `;
}
export function businessSuspendedEmail(params: {
  name: string;
  business_name: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #dc2626;">Your KopaAlert Account Has Been Suspended</h2>
      <p>Hi ${params.name},</p>
      <p>Your business "<strong>${params.business_name}</strong>" and its team no longer have access to KopaAlert. This account has been suspended by KopaAlert administration.</p>
      <p>If you believe this is a mistake or would like more information, please get in touch.</p>
      <hr />
      <p>Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>— The KopaAlert Team</p>
    </div>
  `;
}

export function businessActivatedEmail(params: {
  name: string;
  business_name: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">Your KopaAlert Account Is Active Again</h2>
      <p>Hi ${params.name},</p>
      <p>Good news - your business "<strong>${params.business_name}</strong>" and its team have regained full access to KopaAlert.</p>
      <p>You can log in and pick up right where you left off.</p>
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>— The KopaAlert Team</p>
    </div>
  `;
}

export function passwordResetEmail(params: {
  name: string;
  reset_url: string;
  support_email: string;
  support_phone: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">Set a new KopaAlert password</h2>
      <p>Hi ${params.name},</p>
      <p>Someone requested to change the password on your KopaAlert account. Follow this link to continue:</p>
      <p><a href="${params.reset_url}">${params.reset_url}</a></p>
      <p>If this wasn't you, no action is needed - your password stays the same.</p>
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>- The KopaAlert Team</p>
    </div>
  `;
}

export function subscriptionInvoiceReceiptEmail(params: {
  name: string;
  business_name: string;
  invoice_number: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference?: string | null;
  payment_type: 'monthly' | 'one_time';
  period_start: string;
  period_end?: string | null;
  support_email: string;
  support_phone: string;
}) {
  const periodStart = new Date(params.period_start).toLocaleDateString();
  const periodEnd = params.period_end ? new Date(params.period_end).toLocaleDateString() : null;

  const isOneTime = params.payment_type === 'one_time';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">Payment Received - Invoice &amp; Receipt</h2>
      <p>Hi ${params.name},</p>
      <p>We've recorded your KopaAlert ${isOneTime ? 'one-time system fee' : 'monthly subscription'} payment for "<strong>${params.business_name}</strong>".</p>
      <p><strong>Invoice Number:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.invoice_number}</code></p>
      <p><strong>Amount Paid:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.currency} ${params.amount.toLocaleString()}</code></p>
      <p><strong>Payment Method:</strong> ${params.payment_method}</p>
      ${params.reference ? `<p><strong>Reference:</strong> ${params.reference}</p>` : ''}
      ${
        isOneTime
          ? `<p style="color:#64748b; font-size: 13px;">This is the one-time system fee for using KopaAlert. It's separate from your monthly subscription, which continues to cover maintenance and services like SMS.</p>`
          : `<p><strong>Billing Period:</strong> ${periodStart} - ${periodEnd}</p>
      <p style="color:#64748b; font-size: 13px;">Your account is active and your next renewal is due on ${periodEnd}.</p>`
      }
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>- The KopaAlert Team</p>
    </div>
  `;
}

export function subscriptionRenewalReminderEmail(params: {
  name: string;
  business_name: string;
  amount: number;
  currency: string;
  expires_at: string;
  support_email: string;
  support_phone: string;
}) {
  const expiresAt = new Date(params.expires_at).toLocaleDateString();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #2563eb;">Your KopaAlert subscription renews soon</h2>
      <p>Hi ${params.name},</p>
      <p>Your KopaAlert subscription for "<strong>${params.business_name}</strong>" renews on <strong>${expiresAt}</strong>.</p>
      <p><strong>Amount Due:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.currency} ${params.amount.toLocaleString()}</code></p>
      <p style="color:#64748b; font-size: 13px;">Get in touch with support to arrange payment before the renewal date so your account stays active without interruption.</p>
      <hr />
      <p>Need help? Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>- The KopaAlert Team</p>
    </div>
  `;
}

export function subscriptionLockedNoticeEmail(params: {
  name: string;
  business_name: string;
  amount: number;
  currency: string;
  expires_at: string;
  support_email: string;
  support_phone: string;
}) {
  const expiresAt = new Date(params.expires_at).toLocaleDateString();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      ${LOGO_HEADER}
      <h2 style="color: #dc2626;">Your KopaAlert Account Has Been Locked</h2>
      <p>Hi ${params.name},</p>
      <p>Your KopaAlert subscription for "<strong>${params.business_name}</strong>" lapsed on <strong>${expiresAt}</strong> and your team no longer has access to the dashboard.</p>
      <p><strong>Amount Due:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:4px;">${params.currency} ${params.amount.toLocaleString()}</code></p>
      <p>Contact support to arrange payment and restore access immediately.</p>
      <hr />
      <p>Contact support:<br/>
      Email: ${params.support_email}<br/>
      Phone: ${params.support_phone}</p>
      <p>- The KopaAlert Team</p>
    </div>
  `;
}
