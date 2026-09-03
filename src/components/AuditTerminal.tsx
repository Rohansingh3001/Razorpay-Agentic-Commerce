import React, { useEffect, useRef } from 'react';

type AuditLog = {
  timestamp: number;
  tool: string;
  args: any;
  result?: any;
};

interface AuditTerminalProps {
  isOpen: boolean;
  toggle: () => void;
  logs: AuditLog[];
}

export default function AuditTerminal({ isOpen, toggle, logs }: AuditTerminalProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isOpen]);

  return (
    <div 
      className={`terminal animate-snap`}
      style={{ 
        height: isOpen ? '300px' : '42px', /* Collapse to header height when closed */
        display: 'flex', 
        flexDirection: 'column', 
        borderTop: 'var(--border-heavy)', 
        background: 'var(--black)',
        transition: 'height 0.2s cubic-bezier(0, 0, 0.2, 1)',
        overflow: 'hidden', /* Hide content when closed */
        flexShrink: 0 /* Prevent it from being squished */
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: 'var(--border-medium)', marginBottom: '12px', borderColor: '#333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 12, height: 12, background: 'var(--neon-green)', border: '1px solid var(--black)' }} />
          <span style={{ color: 'var(--white)', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>SYS_AUDIT_LOG</span>
        </div>
        <button 
          onClick={toggle}
          style={{ background: 'var(--white)', color: 'var(--black)', border: 'var(--border-medium)', cursor: 'pointer', padding: '4px 8px', fontFamily: 'JetBrains Mono', fontWeight: 800, textTransform: 'uppercase' }}
        >
          {isOpen ? '[X] CLOSE' : '[^] EXPAND'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: isOpen ? 'block' : 'none' }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--neon-yellow)', fontStyle: 'italic', marginTop: '10px', opacity: 0.5 }}>// AWAITING_EXECUTION...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="terminal-line animate-snap" style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderLeft: '4px solid var(--neon-cyan)' }}>
              <div style={{ display: 'flex', gap: '8px', color: '#888', fontSize: '0.75rem' }}>
                <span>[{new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}]</span>
                <span style={{ color: 'var(--neon-pink)', fontWeight: 'bold' }}>SYSTEM_ROOT</span>
              </div>
              <div className="terminal-prompt" style={{ marginTop: '4px' }}>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 800 }}>EXEC_TOOL:</span> <span style={{ color: 'var(--white)' }}>{log.tool}</span>
              </div>
              <pre style={{ margin: '8px 0 8px 16px', color: 'var(--neon-yellow)', fontSize: '0.85rem' }}>
                ARGS = {JSON.stringify(log.args, null, 2)}
              </pre>
              {log.result && (
                <div style={{ margin: '4px 0 0 16px', color: 'var(--neon-green)', fontWeight: 'bold' }}>
                  → [OK] SUCCESS
                </div>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
