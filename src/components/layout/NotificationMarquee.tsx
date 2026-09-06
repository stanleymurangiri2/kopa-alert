import { AlertTriangle } from 'lucide-react';

export default function NotificationMarquee({ message }: { message: string }) {
  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-warning/30 bg-warning/10 py-2">
      <div className="inline-flex w-max animate-marquee items-center gap-2">
        <MarqueeContent message={message} />
        <MarqueeContent message={message} aria-hidden />
      </div>
    </div>
  );
}

function MarqueeContent({
  message,
  ...rest
}: {
  message: string;
  'aria-hidden'?: boolean;
}) {
  return (
    <span className="mx-6 flex items-center gap-2 text-sm font-medium text-warning" {...rest}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {message}
    </span>
  );
}
