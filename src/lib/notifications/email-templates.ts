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