import { sendEmail } from "./email-service";
import { sendSMS } from "./sms-service";


export async function sendBusinessInvitation({

email,
phone,
businessName,
businessCode,
password,

}:{

email:string;
phone:string;
businessName:string;
businessCode:string;
password:string;

}){


await sendEmail({

to:email,

subject:
"🎉 Welcome to KopaAlert Community",

html:`

<h2>
Welcome to KopaAlert
</h2>


<p>
Dear Distinguished CEO of
<b>${businessName}</b>,
</p>


<p>
Your business registration has been approved.
</p>


<p>
Your Business ID:
<b>${businessCode}</b>
</p>


<p>
Email:
${email}
</p>


<p>
Temporary Password:
${password}
</p>


<p>
For security, please login and change your password immediately.
</p>


<hr/>


<p>
KopaAlert is built and managed by
<b>Solution Tech Company</b>.
</p>

`

});



await sendSMS({

phone,

message:

`KopaAlert: Congratulations ${businessName}. Your business has been approved. Business ID: ${businessCode}. Check your email for login details.`

});


}