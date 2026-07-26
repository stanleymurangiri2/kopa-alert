declare module "africastalking" {
  interface AfricasTalkingOptions {
    apiKey: string;
    username: string;
  }

  interface SmsService {
    send(options: {
      to: string | string[];
      message: string;
      from?: string;
      enqueue?: boolean;
    }): Promise<any>;
  }

  interface AfricasTalkingClient {
    SMS: SmsService;
  }

  export default function AfricasTalking(
    options: AfricasTalkingOptions
  ): AfricasTalkingClient;
}