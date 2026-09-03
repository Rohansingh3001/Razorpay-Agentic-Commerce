"use client";

import React, { useState, useEffect, useRef } from "react";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AuditTrailItem = {
  tool: string;
  args: any;
};

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
};

export default function CheckoutChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am your AI sales assistant. I can help you find products and checkout securely. How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditTrailItem[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [sessionId, setSessionId] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a simple session ID
    setSessionId(`sess_${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, auditTrail]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setAuditTrail([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, messages: newMessages }),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
        setAuditTrail(data.audit_trail || []);
        setCart(data.cart || []);
      } else {
        alert("Error communicating with agent: " + (data.detail || "Unknown error"));
      }
    } catch (e) {
      alert("Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text: string) => {
    // Basic formatting for urls to become clickable links (especially Razorpay links)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)", textDecoration: "underline", fontWeight: "bold" }}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginTop: "20px" }}>
      
      {/* Chat Window */}
      <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", height: "600px", position: "relative" }}>
        
        {/* Header */}
        <div style={{ padding: "20px", borderBottom: "1px solid var(--panel-border)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>AI Buyer Assistant</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--success)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} /> Online
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "75%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                border: msg.role === "user" ? "none" : "1px solid var(--panel-border)",
                color: "#fff",
                lineHeight: 1.5,
                fontSize: "0.95rem"
              }}>
                {formatText(msg.content)}
              </div>
            </div>
          ))}

          {/* Loading Indicator / Audit Trail (if active) */}
          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--panel-border)", display: "flex", gap: "8px", alignItems: "center" }}>
                <div className="typing-dot" style={{ animationDelay: "0s" }}>.</div>
                <div className="typing-dot" style={{ animationDelay: "0.2s" }}>.</div>
                <div className="typing-dot" style={{ animationDelay: "0.4s" }}>.</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "20px", borderTop: "1px solid var(--panel-border)", display: "flex", gap: "12px" }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..." 
            disabled={isLoading}
            style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid var(--panel-border)", color: "#fff", outline: "none", fontSize: "1rem" }}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={isLoading || !input.trim()}>
            Send ↗
          </button>
        </div>

      </div>

      {/* Side Panel for Audit Trail & Cart */}
      <div style={{ width: "350px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Cart */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            🛒 Shopping Cart ({cart.length})
          </h3>
          {cart.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Your cart is empty.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.category}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--success)" }}>₹{item.price}</div>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--panel-border)", marginTop: "8px", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Total</span>
                <span>₹{cart.reduce((a, b) => a + b.price, 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            🔍 Agent Audit Trail
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Watch the AI agent autonomously execute tools in real-time.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {auditTrail.length === 0 && !isLoading && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>No actions taken yet.</p>
            )}
            
            {auditTrail.map((action, i) => (
              <div key={i} className="animate-fade-in" style={{ padding: "12px", background: "rgba(59, 130, 246, 0.1)", borderLeft: "3px solid var(--accent-blue)", borderRadius: "4px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  🔧 {action.tool}()
                </div>
                <pre style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, overflowX: "auto", background: "transparent", padding: 0 }}>
                  {JSON.stringify(action.args, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
