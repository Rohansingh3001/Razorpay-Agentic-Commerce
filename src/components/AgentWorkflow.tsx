"use client";

import React, { useState } from "react";

interface ToolCall {
  turn: number;
  tool: string;
  arguments: Record<string, any>;
  result: Record<string, any>;
}

interface Campaign {
  customer_id: string;
  segment: string;
  priority: string;
  offer: string;
  channel: string;
  timing: string;
  message: string;
  expected_goal: string;
  agent_reasoning: string;
}

interface WorkflowResult {
  success: boolean;
  customer_id: string;
  campaign: Campaign | null;
  tool_trace: ToolCall[];
  turns: number;
}

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

export default function AgentWorkflow({ selectedCustomerId = "" }: { selectedCustomerId?: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [customerId, setCustomerId] = useState(selectedCustomerId);
  const [error, setError] = useState<string | null>(null);
  const [visibleTurns, setVisibleTurns] = useState(0);

  const [execStatus, setExecStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [execError, setExecError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  // Sync when parent selects a customer from the list
  React.useEffect(() => {
    if (selectedCustomerId) setCustomerId(selectedCustomerId);
  }, [selectedCustomerId]);

  const runWorkflow = async () => {
    setIsRunning(true);
    setResult(null);
    setError(null);
    setVisibleTurns(0);
    setExecStatus("idle");
    setExecError(null);
    setPaymentLink(null);

    try {
      const body = customerId.trim() ? { customer_id: customerId.trim() } : {};
      const res = await fetch("/api/workflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Workflow failed");
      }

      const data: WorkflowResult = await res.json();
      setResult(data);

      // Animate tool calls appearing one by one
      for (let i = 1; i <= data.tool_trace.length; i++) {
        await new Promise((r) => setTimeout(r, 400));
        setVisibleTurns(i);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const executeCampaign = async (simulateFail: boolean = false) => {
    if (!result?.campaign) return;
    setExecStatus("loading");
    setExecError(null);
    setPaymentLink(null);

    try {
      const cid = simulateFail ? "FAIL_TEST" : result.customer_id;
      const res = await fetch("/api/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: cid, campaign: result.campaign }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Execution failed");
      }

      setExecStatus("success");
      setPaymentLink(data.short_url);
    } catch (e: any) {
      setExecStatus("error");
      setExecError(e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Trigger */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "12px", color: "var(--accent-blue)" }}>
          Customer Strategy Agent
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "16px" }}>
          Groq tool-calling agent autonomously fetches customer data and generates a growth campaign.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Customer ID (leave blank for auto-select)"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "8px",
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--panel-border)",
              color: "#fff", fontFamily: "inherit", fontSize: "0.9rem",
            }}
          />
          <button
            className="btn btn-primary"
            onClick={runWorkflow}
            disabled={isRunning}
            style={{ opacity: isRunning ? 0.7 : 1, whiteSpace: "nowrap" }}
          >
            {isRunning ? "Agent Running…" : "Run Agent"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: "12px", color: "var(--danger)", fontSize: "0.85rem" }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Tool Call Trace */}
      {result && (
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: "var(--accent-purple)" }}>Agent Tool Trace</h3>
            <span style={{
              fontSize: "0.75rem", padding: "3px 10px", borderRadius: "20px",
              background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)"
            }}>
              {result.turns} tool calls · Customer {result.customer_id}
            </span>
          </div>

          <div style={{ position: "relative" }}>
            {result.tool_trace.slice(0, visibleTurns).map((tc, i) => (
              <div key={i} className="animate-fade-in" style={{
                display: "flex", gap: "12px", marginBottom: "12px",
              }}>
                {/* Connector line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: tc.tool === "generate_campaign"
                      ? "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))"
                      : "rgba(255,255,255,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", flexShrink: 0,
                    boxShadow: tc.tool === "generate_campaign" ? "0 0 12px var(--accent-blue-glow)" : "none",
                  }}>
                    {TOOL_ICONS[tc.tool] || "🔧"}
                  </div>
                  {i < result.tool_trace.length - 1 && (
                    <div style={{ width: 1, flex: 1, minHeight: 12, background: "var(--panel-border)", marginTop: 4 }} />
                  )}
                </div>

                <div style={{
                  flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: "8px",
                  padding: "10px 14px", marginBottom: 4,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#fff" }}>
                      {tc.tool}()
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Turn {tc.turn}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {Object.entries(tc.result).slice(0, 4).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: "var(--accent-blue)" }}>{k}</span>
                        {": "}
                        <span>{typeof v === "number" ? v.toFixed(3) : String(v)}</span>
                      </div>
                    ))}
                    {Object.keys(tc.result).length > 4 && (
                      <div style={{ color: "#666" }}>+{Object.keys(tc.result).length - 4} more fields</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Result */}
      {result?.campaign && visibleTurns >= result.tool_trace.length && (
        <div className="glass-panel animate-fade-in" style={{
          padding: "24px",
          border: `1px solid ${PRIORITY_COLORS[result.campaign.priority] || "var(--panel-border)"}44`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "1.4rem", marginBottom: "4px" }}>Campaign Generated</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Agent completed in {result.turns} tool calls
              </p>
            </div>
            <div style={{
              padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600,
              background: `${PRIORITY_COLORS[result.campaign.priority]}22`,
              color: PRIORITY_COLORS[result.campaign.priority],
              border: `1px solid ${PRIORITY_COLORS[result.campaign.priority]}44`,
            }}>
              {result.campaign.priority.toUpperCase()} PRIORITY
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            {[
              { label: "Segment", value: result.campaign.segment.replace(/_/g, " "), color: "var(--accent-purple)" },
              { label: "Channel", value: result.campaign.channel, color: "var(--accent-blue)" },
              { label: "Send Time", value: result.campaign.timing, color: "var(--success)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.03)", padding: "14px",
                borderRadius: "8px", borderTop: `2px solid ${color}`,
              }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "6px" }}>{label}</p>
                <p style={{ color, fontWeight: 600, fontSize: "1rem", textTransform: "capitalize" }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(59,130,246,0.08)", borderRadius: "10px",
            padding: "16px", marginBottom: "16px",
            borderLeft: "3px solid var(--accent-blue)",
          }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "6px", textTransform: "uppercase" }}>Offer</p>
            <p style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "10px" }}>{result.campaign.offer}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "4px", textTransform: "uppercase" }}>Message</p>
            <p style={{ fontSize: "0.9rem", fontStyle: "italic", color: "#ccc", marginBottom: "12px" }}>
              "{result.campaign.message}"
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "4px", textTransform: "uppercase" }}>Agent Reasoning (Audit Trail)</p>
            <p style={{ fontSize: "0.85rem", color: "var(--accent-purple)", lineHeight: "1.4" }}>
              {result.campaign.agent_reasoning}
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              Goal: {result.campaign.expected_goal}
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className="btn btn-secondary"
                onClick={() => executeCampaign(true)}
                disabled={execStatus === "loading" || execStatus === "success"}
                style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
              >
                Simulate Failure
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => executeCampaign(false)}
                disabled={execStatus === "loading" || execStatus === "success"}
              >
                {execStatus === "loading" ? "Executing..." : "Approve & Launch →"}
              </button>
            </div>
          </div>

          {/* Execution Result */}
          {execStatus === "success" && (
            <div className="animate-fade-in" style={{ marginTop: "16px", padding: "16px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid var(--success)" }}>
              <p style={{ color: "var(--success)", fontWeight: 600, marginBottom: "8px" }}>✅ Campaign Executed Successfully</p>
              <p style={{ fontSize: "0.85rem" }}>
                Razorpay Payment Link generated: <a href={paymentLink!} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)", textDecoration: "underline" }}>{paymentLink}</a>
              </p>
            </div>
          )}

          {execStatus === "error" && (
            <div className="animate-fade-in" style={{ marginTop: "16px", padding: "16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid var(--danger)" }}>
              <p style={{ color: "var(--danger)", fontWeight: 600, marginBottom: "4px" }}>❌ Execution Halted</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {execError}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
