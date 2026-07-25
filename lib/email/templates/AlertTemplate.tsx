// Location: lib/email/templates/AlertTemplate.tsx
import * as React from 'react';

interface AlertEmailProps {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
}

export const AlertEmailTemplate = ({ userName, title, message, actionUrl }: AlertEmailProps) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#1e293b' }}>
    <h2 style={{ color: '#0f172a' }}>Hello {userName},</h2>
    <h3 style={{ color: '#2563eb' }}>{title}</h3>
    <p style={{ fontSize: '15px', lineHeight: '1.5' }}>{message}</p>
    {actionUrl && (
      <a
        href={actionUrl}
        style={{
          display: 'inline-block',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
          marginTop: '12px',
        }}
      >
        View Details
      </a>
    )}
  </div>
);