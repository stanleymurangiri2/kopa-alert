'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function BusinessRegisterPage() {
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from('business_requests').insert([
      {
        business_name: formData.business_name.trim(),
        owner_name: formData.owner_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        status: 'pending',
      },
    ]);

    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        setMessage({ type: 'error', text: 'A registration request with this email already exists.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to submit registration request.' });
      }
      return;
    }

    setMessage({
      type: 'success',
      text: 'Your business registration request has been submitted. Our admin will review and activate your account.',
    });

    setFormData({
      business_name: '',
      owner_name: '',
      phone: '',
      email: '',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-md border border-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Register Your Business</h1>
          <p className="text-sm text-gray-600 mt-1">Submit request for KopaAlert SaaS</p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Solution Tech Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Full Name</label>
            <input
              type="text"
              required
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="+254712345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Business Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="owner@business.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 mt-4">
          Already registered?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}