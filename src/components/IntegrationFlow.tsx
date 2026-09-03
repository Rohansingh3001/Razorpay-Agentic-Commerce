"use client";

import React, { useState, useEffect } from "react";

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

const TOOL_ICONS: Record<string, string> = {
  get_customer_profile: "👤",
  get_purchase_history: "🛒",
  get_discount_response: "🏷️",
  get_best_channel: "📡",
  get_best_time: "⏰",
  generate_campaign: "🚀",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function IntegrationFlow() {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isPredicting, setIsPredicting] = useState(false);
  
  // Step 2 State
  const [mlResult, setMlResult] = useState<any>(null);

  // Step 3 State
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [visibleTurns, setVisibleTurns] = useState(0);

  // Step 4 State
  const [execStatus, setExecStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const handlePredict = async () => {
    setIsPredicting(true);
    setMlResult(null);
    setAgentResult(null);
    setExecStatus("idle");
    setCurrentStep(1);

    try {
      const res = await fetch("/api/customers/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMlResult(data);
        setCurrentStep(2);
      } else {
        alert("Prediction failed: " + (data.detail || "Unknown error"));
      }
    } catch (e) {
      alert("Error predicting new customer.");
    } finally {
      setIsPredicting(false);
    }
  };

  const runAgent = async () => {
    setIsAgentRunning(true);
    setAgentResult(null);
    setVisibleTurns(0);

    try {
      const body = { customer_id: mlResult.user_id };
      const res = await fetch("/api/workflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Workflow failed");
      }

      const data = await res.json();
      setAgentResult(data);
      setCurrentStep(3);

      for (let i = 1; i <= data.tool_trace.length; i++) {
        await new Promise((r) => setTimeout(r, 400));
        setVisibleTurns(i);
      }
    } catch (e: any) {
      alert("Agent error: " + e.message);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const executeCampaign = async (simulateFail: boolean = false) => {
    if (!agentResult?.campaign) return;
    setExecStatus("loading");

    try {
      const cid = simulateFail ? "FAIL_TEST" : agentResult.customer_id;
      const res = await fetch("/api/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: cid, campaign: agentResult.campaign }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Execution failed");
      }

      setExecStatus("success");
      setPaymentLink(data.short_url);
      setCurrentStep(4);
    } catch (e: any) {
      setExecStatus("error");
      setExecError(e.message);
      setCurrentStep(4);
    }
  };

  return (
    <div className="flow-container">
      
      {/* STEP 1: INGESTION */}
      <div className="flow-step" data-status={currentStep >= 1 ? "completed" : "active"}>
        <div className="step-title">
          1. Data Ingestion <span style={{fontSize: "0.8rem", color: "var(--accent-blue)", fontWeight: 400}}>(Live Integration)</span>
        </div>
        <p className="step-subtitle">A new customer engages with your platform. Their behavioral stats are ingested in real-time.</p>
        
        <div className="glow-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label className="data-label">Customer ID</label>
            <input value={formData.user_id} onChange={(e) => setFormData({...formData, user_id: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
          <div>
            <label className="data-label">Recency (Days)</label>
            <input type="number" value={formData.recency_days} onChange={(e) => setFormData({...formData, recency_days: Number(e.target.value)})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
          <div>
            <label className="data-label">Normal Interval (Days)</label>
            <input type="number" value={formData.purchase_interval_days} onChange={(e) => setFormData({...formData, purchase_interval_days: Number(e.target.value)})} style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handlePredict} disabled={isPredicting}>
          {isPredicting ? "Ingesting Data..." : "Push to Database →"}
        </button>
      </div>

      {/* STEP 2: ML SCORING */}
      {mlResult && (
        <div className="flow-step animate-fade-in" data-status={currentStep >= 2 ? "completed" : "active"}>
          <div className="step-title">
            2. ML Intelligence <span style={{fontSize: "0.8rem", color: "var(--accent-purple)", fontWeight: 400}}>(Neon DB)</span>
          </div>
          <p className="step-subtitle">Scores calculated on the fly and persisted to Neon DB for the agent to use.</p>
          
          <div className="glow-card data-grid" style={{ marginBottom: "16px" }}>
            <div>
              <p className="data-label">Churn Risk</p>
              <p className="data-value" style={{ color: "var(--danger)" }}>{Math.round(mlResult.churn_probability * 100)}%</p>
            </div>
            <div>
              <p className="data-label">Predicted CLV</p>
              <p className="data-value" style={{ color: "var(--success)" }}>₹{mlResult.clv.toLocaleString()}</p>
            </div>
            <div>
              <p className="data-label">Purchase Intent</p>
              <p className="data-value" style={{ color: "var(--accent-blue)" }}>{Math.round(mlResult.purchase_intent * 100)}%</p>
            </div>
            <div>
              <p className="data-label">Value Tier</p>
              <p className="data-value">{mlResult.value_tier.toUpperCase()}</p>
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={runAgent} disabled={isAgentRunning}>
            {isAgentRunning ? "Agent is Thinking..." : "Trigger AI Agent →"}
          </button>
        </div>
      )}

      {/* STEP 3: AGENT STRATEGY */}
      {agentResult && (
        <div className="flow-step animate-fade-in" data-status={currentStep >= 3 ? "completed" : "active"}>
          <div className="step-title">
            3. Agentic Strategy <span style={{fontSize: "0.8rem", color: "var(--accent-blue)", fontWeight: 400}}>(Groq LLM)</span>
          </div>
          <p className="step-subtitle">Agent autonomously queries Neon DB via tools to assemble a hyper-personalized campaign.</p>

          <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {agentResult.tool_trace.slice(0, visibleTurns).map((tc: any, i: number) => (
              <div key={i} className="animate-fade-in glow-card" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{TOOL_ICONS[tc.tool] || "🔧"}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>{tc.tool}()</span>
              </div>
            ))}
          </div>

          {agentResult.campaign && visibleTurns >= agentResult.tool_trace.length && (
            <div className="glow-card animate-fade-in" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[agentResult.campaign.priority] || "var(--accent-blue)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <h4 style={{ color: "var(--text-primary)" }}>Generated Campaign</h4>
                <span style={{ fontSize: "0.75rem", color: PRIORITY_COLORS[agentResult.campaign.priority], fontWeight: 600, background: "rgba(0,0,0,0.5)", padding: "2px 8px", borderRadius: "12px" }}>
                  {agentResult.campaign.priority.toUpperCase()} PRIORITY
                </span>
              </div>
              
              <div className="data-grid" style={{ marginBottom: "16px" }}>
                <div>
                  <p className="data-label">Offer</p>
                  <p className="data-value">{agentResult.campaign.offer}</p>
                </div>
                <div>
                  <p className="data-label">Channel</p>
                  <p className="data-value" style={{ textTransform: "capitalize" }}>{agentResult.campaign.channel}</p>
                </div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.5)", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                <p className="data-label" style={{ color: "var(--accent-purple)" }}>Agent Reasoning (Audit Trail)</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {agentResult.campaign.agent_reasoning}
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn-secondary" onClick={() => executeCampaign(true)} disabled={execStatus !== "idle"}>
                  Simulate Failure
                </button>
                <button className="btn btn-primary" onClick={() => executeCampaign(false)} disabled={execStatus !== "idle"}>
                  {execStatus === "loading" ? "Processing..." : "Approve & Execute via Razorpay →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: EXECUTION */}
      {execStatus !== "idle" && (
        <div className="flow-step animate-fade-in" data-status={execStatus === "success" ? "completed" : "active"}>
          <div className="step-title">
            4. Money Action <span style={{fontSize: "0.8rem", color: "var(--success)", fontWeight: 400}}>(Razorpay API)</span>
          </div>
          
          {execStatus === "loading" && <p className="step-subtitle">Generating payment link...</p>}
          
          {execStatus === "success" && (
            <div className="glow-card animate-fade-in" style={{ borderColor: "var(--success)", background: "rgba(16, 185, 129, 0.05)" }}>
              <p style={{ color: "var(--success)", fontWeight: 600, fontSize: "1.1rem", marginBottom: "8px" }}>✅ Execution Successful</p>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                The agent's strategy was successfully translated into a live transaction.
              </p>
              <div style={{ marginTop: "12px", padding: "12px", background: "rgba(0,0,0,0.5)", borderRadius: "8px" }}>
                <span className="data-label">Razorpay Test Link:</span><br/>
                <a href={paymentLink!} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)", fontSize: "0.95rem" }}>
                  {paymentLink}
                </a>
              </div>
            </div>
          )}

          {execStatus === "error" && (
            <div className="glow-card animate-fade-in" style={{ borderColor: "var(--danger)", background: "rgba(239, 68, 68, 0.05)" }}>
              <p style={{ color: "var(--danger)", fontWeight: 600, fontSize: "1.1rem", marginBottom: "8px" }}>❌ Execution Halted</p>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                The payment action was safely blocked. Error details:
              </p>
              <div style={{ marginTop: "12px", padding: "12px", background: "rgba(0,0,0,0.5)", borderRadius: "8px", color: "var(--danger)", fontFamily: "monospace", fontSize: "0.85rem" }}>
                {execError}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
