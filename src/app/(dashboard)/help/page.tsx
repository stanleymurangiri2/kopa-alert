import { MessageCircle, Phone, Mail } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/lib/constants/support';

export default function HelpPage() {
  const channels = [
    {
      title: 'WhatsApp',
      description: 'Chat with our support team for the fastest response.',
      value: SUPPORT_PHONE,
      href: SUPPORT_WHATSAPP_URL,
      cta: 'Open WhatsApp',
      icon: MessageCircle,
      accent: 'bg-success/10 text-success',
    },
    {
      title: 'Call Us',
      description: 'Speak directly with our team during business hours.',
      value: SUPPORT_PHONE,
      href: `tel:${SUPPORT_PHONE}`,
      cta: 'Call Now',
      icon: Phone,
      accent: 'bg-primary/10 text-primary',
    },
    {
      title: 'Email',
      description: "Send us a message and we'll get back to you.",
      value: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
      cta: 'Send Email',
      icon: Mail,
      accent: 'bg-info/10 text-info',
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground mt-1">
          Need a hand? Reach the KopaAlert support team through any of the channels below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {channels.map((channel) => {
          const Icon = channel.icon;

          return (
            <a
              key={channel.title}
              href={channel.href}
              target={channel.href.startsWith('http') ? '_blank' : undefined}
              rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div>
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${channel.accent}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition">
                  {channel.title}
                </h2>

                <p className="text-sm text-muted-foreground mt-2">{channel.description}</p>

                <p className="mt-3 text-sm font-medium text-foreground">{channel.value}</p>
              </div>

              <div className="mt-6 flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                {channel.cta} &rarr;
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
