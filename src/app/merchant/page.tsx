"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PurchaseItem = { name: string; quantity: number; unit_price: number };
type PurchaseRequest = {
  id: string;
  total: number;
  policy_decision: string;
  approval_status: string;
  created_at: string;
  shipping_address: string;
  items: PurchaseItem[];
};

const API_URL = "http://localhost:8000";

export default function MerchantPortal() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/merchant/purchase-requests`);
      if (!response.ok) throw new Error("Request feed unavailable");
      const data = await response.json();
      setRequests(data.requests);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    const refreshTimer = window.setInterval(() => { void loadRequests(); }, 3000);
    return () => window.clearInterval(refreshTimer);
  }, [loadRequests]);

  const approve = async (requestId: string) => {
    setBusyId(requestId);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/purchase/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_request_id: requestId, session_id: "merchant_portal" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Approval failed");
      setMessage("Merchant approval recorded. The buyer will receive the Razorpay payment link.");
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="merchant-portal">
      <header className="merchant-header">
        <Link href="/" className="merchant-brand">Agentic<span>Commerce</span></Link>
        <div className="merchant-header-right"><span className="merchant-live"><i /> Merchant console</span><Link href="/agent" className="btn btn-secondary">Open buyer view ↗</Link></div>
      </header>
      <section className="merchant-content">
        <div className="merchant-intro">
          <div><span className="section-kicker">Merchant control plane</span><h1>Approve the<br /><em>next transaction.</em></h1><p>Review agent-created purchase requests, validate the context, and issue a Razorpay Test Mode payment link.</p><button className="merchant-refresh" onClick={() => void loadRequests()} disabled={loading}>REFRESH QUEUE ↻</button></div>
          <div className="merchant-stat"><strong>{requests.length}</strong><span>Pending requests</span></div>
        </div>
        {message && <div className="merchant-notice">{message}</div>}
        {loading ? <div className="merchant-empty">LOADING_REQUEST_QUEUE...</div> : requests.length === 0 ? <div className="merchant-empty"><strong>QUEUE_CLEAR</strong><span>No pending purchase requests right now.</span></div> : (
          <div className="request-list">
            {requests.map((request) => (
              <article className="request-card" key={request.id}>
                <div className="request-card-top"><div><span className="request-kicker">Purchase request</span><h2>#{request.id.slice(0, 8)}</h2></div><span className="policy-badge">{request.policy_decision}</span></div>
                <div className="request-items">{request.items.map((item) => <div className="request-item" key={item.name}><span>{item.name} <b>× {item.quantity}</b></span><strong>₹{Number(item.unit_price * item.quantity).toLocaleString("en-IN")}</strong></div>)}</div>
                {request.shipping_address && (
                  <div className="request-shipping" style={{ padding: '12px 16px', background: 'var(--white)', borderBottom: 'var(--border-heavy)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }}>
                    <div style={{ color: 'var(--neon-pink)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Address</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{request.shipping_address}</div>
                  </div>
                )}
                <div className="request-card-bottom"><div><span>Total due</span><strong>₹{request.total.toLocaleString("en-IN")}</strong></div><button className="btn btn-primary" onClick={() => approve(request.id)} disabled={busyId === request.id || request.policy_decision === "BLOCKED"}>{request.policy_decision === "BLOCKED" ? "BLOCKED BY POLICY" : busyId === request.id ? "CREATING LINK..." : "APPROVE & CREATE LINK ↗"}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
