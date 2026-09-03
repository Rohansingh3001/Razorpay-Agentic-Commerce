"use client";

import React, { useState, useEffect } from 'react';

type AgentState = 'idle' | 'running' | 'complete';
type AgentLog = { id: string, agent: string, message: string, time: string };

interface AgentActivityFeedProps {
  onWorkflowComplete: (data: any) => void;
  isTriggered: boolean;
}

export default function AgentActivityFeed({ onWorkflowComplete, isTriggered }: AgentActivityFeedProps) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [segState, setSegState] = useState<AgentState>('idle');
  const [offState, setOffState] = useState<AgentState>('idle');
  const [campState, setCampState] = useState<AgentState>('idle');

  const addLog = (agent: string, message: string) => {
    setLogs(prev => [...prev, { id: crypto.randomUUID(), agent, message, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (!isTriggered) return;

    const runAgents = async () => {
      setLogs([]);
      setSegState('running');
      addLog('Segmentation Agent', 'Scanning recent transaction data...');
      
      const segRes = await fetch('/api/agents/segmentation', {
        method: 'POST', body: JSON.stringify({ action: 'analyze' })
      }).then(res => res.json());

      setSegState('complete');
      addLog('Segmentation Agent', `Found ${segRes.data.segments.length} segments. High intent cohort identified.`);
      
      setOffState('running');
      addLog('Offer Agent', 'Analyzing purchase history for cohort "Inactive High Intent"...');
      
      const offRes = await fetch('/api/agents/offer', {
        method: 'POST', body: JSON.stringify({ segmentId: 'seg_1' })
      }).then(res => res.json());

      setOffState('complete');
      addLog('Offer Agent', `Selected offer: ${offRes.data.offer}. Reason: ${offRes.data.reasoning}`);

      setCampState('running');
      addLog('Campaign Agent', 'Determining optimal channel and send time...');

      const campRes = await fetch('/api/agents/campaign', {
        method: 'POST', body: JSON.stringify({ segmentId: 'seg_1', offer: offRes.data.offer })
      }).then(res => res.json());

      setCampState('complete');
      addLog('Campaign Agent', `Selected Channel: ${campRes.data.channel} at ${campRes.data.bestTime}`);

      onWorkflowComplete({
        segment: segRes.data.segments[0],
        offer: offRes.data,
        campaign: campRes.data
      });
    };

    runAgents();
  }, [isTriggered]);

  const renderAgentStatus = (name: string, state: AgentState) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%', marginRight: 10,
        backgroundColor: state === 'running' ? 'var(--warning)' : state === 'complete' ? 'var(--success)' : 'var(--text-secondary)',
        boxShadow: state === 'running' ? '0 0 8px var(--warning)' : 'none'
      }} />
      <span style={{ color: state === 'running' ? '#fff' : 'var(--text-secondary)' }}>{name}</span>
    </div>
  );

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ marginBottom: '15px', color: 'var(--accent-blue)' }}>Agent Swarm Status</h3>
        {renderAgentStatus('Segmentation Agent', segState)}
        {renderAgentStatus('Offer Agent', offState)}
        {renderAgentStatus('Campaign Agent', campState)}
      </div>
      
      <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '15px', overflowY: 'auto', maxHeight: '200px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Activity Log</h4>
        {logs.map(log => (
          <div key={log.id} className="animate-fade-in" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>[{log.time}] </span>
            <strong style={{ color: 'var(--accent-purple)' }}>{log.agent}: </strong>
            <span>{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && !isTriggered && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Waiting for trigger...</div>}
      </div>
    </div>
  );
}
