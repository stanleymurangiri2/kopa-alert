import Africastalking from "africastalking";


const africastalking =
Africastalking({

username:
process.env.AT_USERNAME!,

apiKey:
process.env.AT_API_KEY!,

});


const sms =
africastalking.SMS;



export async function sendSMS({
phone,
message,
}:{
phone:string;
message:string;
}){


return await sms.send({

to:[
phone
],

message,

});

}