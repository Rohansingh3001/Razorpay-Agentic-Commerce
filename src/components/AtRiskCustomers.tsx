"use client";

import React, { useEffect, useState } from "react";

const INITIAL_FORM = {
  user_id: `NEW_${Math.floor(Math.random() * 10000)}`,
  recency_days: 30,
  purchase_interval_days: 14,
  reorder_rate: 0.8,
  avg_order_value: 2500,
  frequency: 5,
  monetary_value: 12500,
  preferred_channel: "whatsapp"
};
interface Customer {
  user_id: string;
  recency_days: number;
  frequency: number;
  monetary_value: number;
  purchase_intent: number;
  churn_probability: number;
  clv: number;
  value_tier: string;
  preferred_channel: string;
  top_department: string;
}

const TIER_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        flex: 1, height: 6, background: "rgba(255,255,255,0.06)",
        borderRadius: 4, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${Math.round(value * 100)}%`,
          background: color, borderRadius: 4,
          transition: "width 0.8s ease",
        }} />
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", width: 32 }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function AtRiskCustomers({ onSelect }: { onSelect: (id: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handlePredict = async () => {
    setIsPredicting(true);
    try {
      const res = await fetch("/api/customers/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Automatically select the new user in the workflow
        onSelect(data.user_id);
        setShowModal(false);
        // Reset form ID for next time
        setFormData({ ...INITIAL_FORM, user_id: `NEW_${Math.floor(Math.random() * 10000)}` });
      } else {
        alert("Prediction failed: " + (data.detail || "Unknown error"));
      }
    } catch (e) {
      alert("Error predicting new customer.");
    } finally {
      setIsPredicting(false);
    }
  };

  useEffect(() => {
    fetch("/api/customers/at-risk?limit=6")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: "20px" }}>
        <h3 style={{ color: "var(--accent-blue)", marginBottom: 16 }}>At-Risk Customers</h3>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Loading from Neon DB…</div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ color: "var(--accent-blue)" }}>At-Risk Customers</h3>
        <button 
          className="btn btn-secondary" 
          style={{ fontSize: "0.75rem", padding: "4px 10px", background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.3)" }}
          onClick={() => setShowModal(true)}
        >
          + Add New Customer
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {customers.map((c) => (
          <div
            key={c.user_id}
            onClick={() => onSelect(c.user_id)}
            style={{
              background: "rgba(255,255,255,0.03)", borderRadius: "10px",
              padding: "12px 14px", cursor: "pointer",
              border: "1px solid transparent",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-blue)";
              (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>User {c.user_id}</span>
                <span style={{
                  marginLeft: 8, fontSize: "0.7rem", padding: "2px 8px",
                  borderRadius: 12, background: `${TIER_COLOR[c.value_tier]}22`,
                  color: TIER_COLOR[c.value_tier],
                }}>
                  {c.value_tier} value
                </span>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>
                CLV ₹{Math.round(Number(c.clv)).toLocaleString()}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>Churn Risk</p>
                <Bar value={c.churn_probability} color="#ef4444" />
              </div>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>Purchase Intent</p>
                <Bar value={c.purchase_intent} color="var(--accent-blue)" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <span>{c.recency_days}d since order</span>
              <span>{c.frequency} orders</span>
              <span>📦 {c.top_department}</span>
              <span>📡 {c.preferred_channel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: "24px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--accent-blue)" }}>Simulate New Customer</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Customer ID</label>
                <input value={formData.user_id} onChange={(e) => setFormData({...formData, user_id: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--panel-border)", color: "#fff" }} />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Days Since Last Order</label>
                <input type="number" value={formData.recency_days} onChange={(e) => setFormData({...formData, recency_days: Number(e.target.value)})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--panel-border)", color: "#fff" }} />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Normal Interval (Days)</label>
                <input type="number" value={formData.purchase_interval_days} onChange={(e) => setFormData({...formData, purchase_interval_days: Number(e.target.value)})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--panel-border)", color: "#fff" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Avg Order Value (₹)</label>
                <input type="number" value={formData.avg_order_value} onChange={(e) => setFormData({...formData, avg_order_value: Number(e.target.value)})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--panel-border)", color: "#fff" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Total Orders (Freq)</label>
                <input type="number" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: Number(e.target.value)})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--panel-border)", color: "#fff" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isPredicting}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePredict} disabled={isPredicting}>
                {isPredicting ? "Predicting..." : "Predict & Select"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
