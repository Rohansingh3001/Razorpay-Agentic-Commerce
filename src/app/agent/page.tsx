"use client";

import React, { useState } from "react";
import AgentChatInterface from "@/components/AgentChatInterface";
import AuditTerminal from "@/components/AuditTerminal";

export default function AgentDashboard() {
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const addLog = (tool: string, args: any, result?: any) => {
    setAuditLogs(prev => [...prev, { timestamp: Date.now(), tool, args, result }]);
  };

  return (
    <main className="app-layout">
      {/* Main: Chat Interface */}
      <section className="chat-section" style={{ flex: 2 }}>
        <AgentChatInterface 
          addLog={addLog} 
        />
      </section>

      {/* Side: Audit Terminal */}
      <section className="workspace-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-base)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            System Integrity
          </h3>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
             Agentic Commerce enabled. All product browsing and transactions are now fully supported natively within the secure chat feed.
          </p>
        </div>
        
        <AuditTerminal 
          isOpen={terminalOpen} 
          toggle={() => setTerminalOpen(!terminalOpen)}
          logs={auditLogs}
        />
      </section>
    </main>
  );
}
