"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AlertsPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAlerts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return;

    const { data } = await supabase
      .from("notification_queue")
      .select("*, debts(description), customers(full_name)")
      .eq("business_id", profile.business_id)
      .order("created_at", { ascending: false });

    setAlerts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function handleDispatchAlerts() {
    setTriggering(true);
    setMessage("");
    try {
      const res = await fetch("/api/notifications", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(`Successfully processed ${data.processed} alerts (${data.sent} sent, ${data.failed} failed).`);
        await loadAlerts();
      } else {
        setMessage(`Error: ${data.error || "Failed to dispatch alerts"}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Alerts & Notifications</h1>
          <p className="text-slate-500 mt-1">Manage scheduled SMS alerts, view queue status, and trigger manual dispatches.</p>
        </div>
        <button
          onClick={handleDispatchAlerts}
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {triggering ? "Dispatching..." : "⚡ Dispatch Pending Alerts"}
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading alerts queue...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          No alert notifications currently queued.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Scheduled / Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {alerts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.customers?.full_name || "N/A"}</td>
                  <td className="px-6 py-4">{item.recipient_phone}</td>
                  <td className="px-6 py-4 max-w-md whitespace-normal break-words">{item.message_body}</td>
                  <td className="px-6 py-4 uppercase text-xs font-semibold tracking-wider text-slate-500">{item.channel}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'sent' ? 'bg-green-100 text-green-800' :
                      item.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(item.sent_at || item.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

