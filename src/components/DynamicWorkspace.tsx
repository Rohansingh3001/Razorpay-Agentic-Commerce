import React from 'react';

interface WorkspaceProps {
  workspaceState: { view: string; data: any };
  setWorkspaceState: (state: any) => void;
  addLog: (tool: string, args: any, result?: any) => void;
}

export default function DynamicWorkspace({ workspaceState, setWorkspaceState, addLog }: WorkspaceProps) {
  const { view, data } = workspaceState;

  if (view === 'idle' || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-base)' }}>
        <div style={{ padding: '2rem', border: 'var(--border-heavy)', background: 'var(--white)', boxShadow: 'var(--shadow-brutal-cyan)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontFamily: 'JetBrains Mono', fontWeight: 800, marginBottom: '1rem' }}>WAITING_DATA</div>
          <p style={{ fontWeight: 600, textTransform: 'uppercase' }}>Workspace is currently unpopulated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-snap" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
      
      {view === 'catalog' && (
        <div>
          <h3 style={{ fontSize: '2rem', marginBottom: '2rem', textTransform: 'uppercase', fontWeight: 800, borderBottom: 'var(--border-heavy)', paddingBottom: '16px', display: 'inline-block', background: 'var(--neon-pink)', color: 'var(--white)', padding: '8px 16px' }}>
            DATA_VIEW: CATALOG
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
            {data.products.map((p: any) => (
              <div key={p.id} className="brutal-card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: '100%', height: '140px', background: 'var(--black)', color: 'var(--neon-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', borderBottom: 'var(--border-heavy)' }}>
                  {p.emoji || '📦'}
                </div>
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 16px 0', fontWeight: 600 }}>{p.description}</p>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neon-yellow)', padding: '8px', border: 'var(--border-medium)', boxShadow: '2px 2px 0px var(--black)' }}>
                     <span style={{ fontWeight: 800, fontFamily: 'JetBrains Mono' }}>₹{p.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'cart' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2rem', marginBottom: '2rem', textTransform: 'uppercase', fontWeight: 800, display: 'inline-block', background: 'var(--neon-cyan)', color: 'var(--black)', padding: '8px 16px', border: 'var(--border-heavy)', boxShadow: 'var(--shadow-brutal)' }}>
            DATA_VIEW: CART
          </h3>
          <div className="brutal-panel">
            {data.items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: 'var(--border-medium)', marginBottom: '16px', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>{item.name}</h4>
                  <div style={{ display: 'inline-block', background: 'var(--black)', color: 'var(--white)', padding: '2px 8px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', marginTop: '4px' }}>
                    QTY: {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>₹{item.price * item.quantity}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 800, marginTop: '32px', background: 'var(--neon-yellow)', padding: '16px', border: 'var(--border-heavy)' }}>
              <span>TOTAL_DUE:</span>
              <span>₹{data.total}</span>
            </div>
          </div>
        </div>
      )}

      {view === 'checkout' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
           <h3 style={{ fontSize: '2rem', marginBottom: '2rem', textTransform: 'uppercase', fontWeight: 800, display: 'inline-block', background: 'var(--neon-yellow)', color: 'var(--black)', padding: '8px 16px', border: 'var(--border-heavy)', boxShadow: 'var(--shadow-brutal)' }}>
            TXN_STATE
          </h3>
          <div className="brutal-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: 80, height: 80, background: 'var(--black)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-heavy)', fontSize: '2rem', transform: 'rotate(-5deg)' }}>
              💳
            </div>
            <div style={{ background: 'var(--bg-base)', border: 'var(--border-medium)', padding: '16px', width: '100%', textAlign: 'left', fontFamily: 'JetBrains Mono' }}>
              <div style={{ marginBottom: '8px' }}><strong>ID:</strong> {data.order_id}</div>
              <div><strong>AMT:</strong> ₹{data.amount}</div>
            </div>
            
            {data.status === 'failed' ? (
               <div className="animate-snap" style={{ padding: '16px', background: 'var(--neon-pink)', color: 'var(--white)', border: 'var(--border-heavy)', width: '100%', fontWeight: 800, textTransform: 'uppercase', boxShadow: 'var(--shadow-brutal)' }}>
                 [!] RISK_CHECK_FAILED. AGENT_RECOVERY_ENGAGED.
               </div>
            ) : (
              <div className="animate-snap" style={{ padding: '16px', background: 'var(--neon-green)', color: 'var(--black)', border: 'var(--border-heavy)', width: '100%', fontWeight: 800, textTransform: 'uppercase', boxShadow: 'var(--shadow-brutal)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>[+] SECURE_PAYMENT_LINK_GENERATED.</div>
                {data.payment_link && (
                  <a href={data.payment_link} target="_blank" rel="noreferrer" style={{ background: 'var(--black)', color: 'var(--neon-yellow)', padding: '8px', textAlign: 'center', textDecoration: 'none', border: 'var(--border-medium)', marginTop: '8px', display: 'block' }}>
                    OPEN_PAYMENT_GATEWAY ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
