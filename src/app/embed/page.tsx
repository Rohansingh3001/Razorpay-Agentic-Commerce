"use client";

import React from "react";
import AgentChatInterface from "@/components/AgentChatInterface";

export default function EmbedDashboard() {
  // We use a dummy addLog for the embed since the AuditTerminal is not present
  const addLog = (tool: string, args: any, result?: any) => {
    console.log(`[Agent Tool Call] ${tool}`, { args, result });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <AgentChatInterface 
        addLog={addLog} 
      />
    </div>
  );
}
