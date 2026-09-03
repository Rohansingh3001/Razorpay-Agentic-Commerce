'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const features = [
  {
    number: '01',
    label: 'Conversational checkout',
    title: 'Sell in the flow',
    description: 'Let shoppers discover, decide, and pay without leaving the conversation.',
    className: 'feature-cyan',
  },
  {
    number: '02',
    label: 'Agent catalog',
    title: 'Your catalog, everywhere',
    description: 'Give AI buyers a structured, trusted view of your inventory and offers.',
    className: 'feature-pink',
  },
  {
    number: '03',
    label: 'Audit trail',
    title: 'Control every action',
    description: 'Keep every recommendation, tool call, and transaction visible and bounded.',
    className: 'feature-yellow',
  },
  {
    number: '04',
    label: 'Frictionless',
    title: 'Voice-to-Commerce',
    description: 'Native browser speech recognition to instantly parse intent, fetch inventory, and generate a secure checkout.',
    className: 'feature-cyan',
  },
  {
    number: '05',
    label: 'Predictive ML',
    title: 'Negotiation Agent',
    description: 'Dynamically drop prices for high-churn-risk users to save abandoned carts using Razorpay Offers.',
    className: 'feature-pink',
  },
];

export default function LandingPage() {
  const [activeMockup, setActiveMockup] = useState<string | null>(null);

  return (
    <div className="landing-shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Agentic Commerce home">
          <span>Agentic</span><strong>Commerce</strong>
        </Link>
        <div className="header-actions">
          <span className="header-status"><i /> Test mode</span>
          <Link href="/login" className="btn btn-secondary">Sign in</Link>
          <Link href="/login" className="btn btn-primary">Launch workspace <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy animate-snap">
            <div className="eyebrow"><span className="eyebrow-dot" /> Commerce infrastructure for AI buyers</div>
            <h1>Make your store <span className="text-highlight">AI-ready.</span></h1>
            <p className="hero-description">
              Build, test, and govern agents that turn intent into revenue on Razorpay&apos;s test-mode APIs.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn btn-primary btn-large">Start building <span aria-hidden="true">→</span></Link>
              <a href="#features" className="text-link">Explore the system <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-proof">
              <span><b>01</b> Catalog-aware agents</span>
              <span><b>02</b> Guardrailed payments</span>
              <span><b>03</b> Observable by default</span>
              <span><b>04</b> Voice checkout</span>
              <span><b>05</b> Predictive negotiation</span>
            </div>
          </div>

          <div className="hero-console animate-snap" aria-label="Agent workspace preview">
            <div className="console-topbar">
              <div className="window-controls"><i /><i /><i /></div>
              <span>AGENT_WORKSPACE / 01</span>
              <span className="console-live"><i /> LIVE</span>
            </div>
            <div className="console-body">
              <div className="console-label">Revenue agent <span>v2.4</span></div>
              <div className="console-command">Find the best offer for a returning customer<span className="cursor" /></div>
              <div className="console-divider" />
              <div className="console-result">
                <div className="result-icon">↗</div>
                <div><strong>Intent resolved</strong><small>Cart optimized · 3 actions approved</small></div>
                <span className="result-check">✓</span>
              </div>
              <div className="console-metrics">
                <div><small>CONVERSION LIFT</small><strong>+18.4%</strong></div>
                <div><small>RISK STATUS</small><strong className="green-text">LOW</strong></div>
              </div>
            </div>
            <div className="console-footer"><span>SECURE SESSION</span><span>RAZORPAY TEST MODE</span></div>
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="section-heading">
            <div><span className="section-kicker">The operating layer</span><h2>Built for the next<br /><em>kind</em> of checkout.</h2></div>
            <p>One workspace to design the experience, expose the catalog, and keep every automated decision accountable.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className={`feature-card ${feature.className}`} key={feature.number}>
                <div className="feature-number">{feature.number}</div>
                <div className="feature-content"><span className="feature-label">{feature.label}</span><h3>{feature.title}</h3><p>{feature.description}</p></div>
                <span className="feature-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </section>

        <section id="phase2" className="features-section" style={{ backgroundColor: '#111', color: '#f3f1eb', paddingBottom: '120px' }}>
          <div className="section-heading" style={{ borderBottom: '2px solid #333', paddingBottom: '30px', marginBottom: '40px' }}>
            <div>
              <span className="section-kicker" style={{ color: '#56d7d3' }}>Coming Soon</span>
              <h2 style={{ color: '#f3f1eb' }}>Phase 2: The Future of<br /><em style={{ color: '#eb3b85' }}>Agentic Commerce</em></h2>
            </div>
            <p style={{ color: '#aaa' }}>A sneak peek at the next evolution of our infrastructure, featuring multi-agent swarms, voice AI, and predictive negotiation.</p>
          </div>
          <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            
            <article className="feature-card" onClick={() => setActiveMockup('whatsapp')} style={{ backgroundColor: '#1a1a1a', borderColor: '#333', boxShadow: '6px 6px 0 #56d7d3', cursor: 'pointer' }}>
              <div className="feature-number" style={{ borderColor: '#333', color: '#56d7d3' }}>01</div>
              <div className="feature-content">
                <span className="feature-label" style={{ color: '#56d7d3' }}>Omnichannel</span>
                <h3 style={{ color: '#fff' }}>WhatsApp Checkout</h3>
                <p style={{ color: '#aaa' }}>Let the AI buyer negotiate and build carts directly in WhatsApp, dropping a secure Razorpay link right in the chat.</p>
              </div>
              <span className="feature-arrow" aria-hidden="true" style={{ color: '#56d7d3' }}>💬</span>
            </article>

            <article className="feature-card" onClick={() => setActiveMockup('roi')} style={{ backgroundColor: '#1a1a1a', borderColor: '#333', boxShadow: '6px 6px 0 #8de3b8', cursor: 'pointer' }}>
              <div className="feature-number" style={{ borderColor: '#333', color: '#8de3b8' }}>02</div>
              <div className="feature-content">
                <span className="feature-label" style={{ color: '#8de3b8' }}>Analytics</span>
                <h3 style={{ color: '#fff' }}>Agent ROI Dashboard</h3>
                <p style={{ color: '#aaa' }}>Track AI-generated revenue, average upsell metrics, and policy rejections in real-time.</p>
              </div>
              <span className="feature-arrow" aria-hidden="true" style={{ color: '#8de3b8' }}>📊</span>
            </article>

          </div>
        </section>
      </main>

      <footer className="site-footer"><span>AGENTIC COMMERCE / PLATFORM PREVIEW</span><span>© {new Date().getFullYear()} <b>RAZORPAY</b></span></footer>
      
      {activeMockup && (
        <div className="payment-modal-backdrop" onClick={() => setActiveMockup(null)} style={{ zIndex: 9999 }}>
          <div className="brutal-panel" onClick={e => e.stopPropagation()} style={{ width: 'min(100%, 700px)', background: '#111', color: '#fff', padding: '0', border: '2px solid #333', boxShadow: '10px 10px 0 #eb3b85', display: 'flex', flexDirection: 'column', height: 'min(90vh, 600px)' }}>
            <div className="payment-modal-header" style={{ background: '#000', borderBottom: '2px solid #333' }}>
              <div><span>DEMONSTRATION</span><strong>{activeMockup.toUpperCase()} MOCKUP</strong></div>
              <button className="payment-modal-close" onClick={() => setActiveMockup(null)} style={{ background: '#111', color: '#fff', border: '2px solid #333' }}>×</button>
            </div>
            
            <div style={{ padding: '30px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {activeMockup === 'whatsapp' && (
                <div style={{ width: '100%', maxWidth: '400px', background: '#0b141a', border: '1px solid #2a3942', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <div style={{ background: '#005c4b', color: '#e9edef', padding: '8px 12px', borderRadius: '8px 0 8px 8px', alignSelf: 'flex-end', fontSize: '0.9rem' }}>I need those noise-canceling headphones.</div>
                  <div style={{ background: '#202c33', color: '#e9edef', padding: '8px 12px', borderRadius: '0 8px 8px 8px', alignSelf: 'flex-start', fontSize: '0.9rem' }}>I&apos;ve found them in stock for ₹3499. Should I create a secure payment link?</div>
                  <div style={{ background: '#005c4b', color: '#e9edef', padding: '8px 12px', borderRadius: '8px 0 8px 8px', alignSelf: 'flex-end', fontSize: '0.9rem' }}>Yes please.</div>
                  <div style={{ background: '#202c33', color: '#e9edef', padding: '12px', borderRadius: '0 8px 8px 8px', alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #00a884' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Secure Checkout Generated</div>
                    <div style={{ fontSize: '0.85rem', color: '#8696a0' }}>Total: ₹3499</div>
                    <button style={{ background: '#00a884', color: '#111', border: 'none', padding: '10px', borderRadius: '20px', fontWeight: 'bold', marginTop: '4px', cursor: 'pointer' }}>Pay ₹3499</button>
                  </div>
                </div>
              )}

              {activeMockup === 'voice' && (
                <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', height: '100px', marginBottom: '30px' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                      <div key={i} style={{ width: '8px', height: `${Math.max(20, Math.random() * 80)}px`, background: 'var(--neon-pink)', borderRadius: '10px', animation: 'blink 1s infinite alternate', animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', fontStyle: 'italic', fontWeight: 'normal', color: '#aaa' }}>&quot;Add the carrying case to my cart and check out...&quot;</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--neon-cyan)' }}>
                    <div><span style={{ color: '#fff' }}>[SYS]</span> Audio intent parsed.</div>
                    <div><span style={{ color: '#fff' }}>[SYS]</span> Inventory locked.</div>
                    <div style={{ background: '#111', border: '1px solid var(--neon-cyan)', padding: '10px 20px', marginTop: '10px', color: '#fff' }}>Razorpay link generated in 1.2s.</div>
                  </div>
                </div>
              )}

              {activeMockup === 'negotiation' && (
                <div style={{ display: 'flex', width: '100%', gap: '20px', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ color: '#ffdf38', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>ML Customer Profile</div>
                    <div><small style={{ color: '#888' }}>CHURN RISK</small><strong style={{ display: 'block', color: 'var(--neon-pink)', fontSize: '1.2rem' }}>HIGH (82%)</strong></div>
                    <div><small style={{ color: '#888' }}>LIFETIME VALUE</small><strong style={{ display: 'block', color: '#fff', fontSize: '1.2rem' }}>₹12,450</strong></div>
                    <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(255,0,255,0.1)', borderLeft: '2px solid var(--neon-pink)', fontSize: '0.7rem', color: 'var(--neon-pink)', fontFamily: 'JetBrains Mono' }}>AUTHORIZING 10% DYNAMIC DISCOUNT</div>
                  </div>
                  <div style={{ flex: 1.5, background: '#1a1a1a', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="chat-bubble-user" style={{ padding: '12px', alignSelf: 'flex-end', fontSize: '0.85rem' }}>Hmm, ₹3499 is a bit steep for me right now.</div>
                    <div className="chat-bubble-agent" style={{ padding: '12px', alignSelf: 'flex-start', fontSize: '0.85rem' }}>Wait! Because you&apos;re a loyal customer, I&apos;ve just applied a 10% discount using Razorpay Offers.</div>
                    <div style={{ background: '#000', border: '1px solid #333', padding: '12px', textAlign: 'center', marginTop: '8px' }}>
                      <div style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.8rem' }}>₹3499</div>
                      <div style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '1.4rem' }}>₹3149</div>
                      <button className="btn btn-primary" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', marginTop: '10px' }}>CHECKOUT NOW</button>
                    </div>
                  </div>
                </div>
              )}

              {activeMockup === 'roi' && (
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: '#1a1a1a', padding: '20px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 800 }}>TOTAL AI REVENUE</div>
                    <div style={{ color: 'var(--neon-cyan)', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0' }}>₹1.42L</div>
                    <div style={{ color: 'var(--neon-green)', fontSize: '0.8rem' }}>↑ 24% this month</div>
                  </div>
                  <div style={{ background: '#1a1a1a', padding: '20px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 800 }}>AUTOMATED UPSELL RATE</div>
                    <div style={{ color: 'var(--neon-yellow)', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0' }}>18.4%</div>
                    <div style={{ color: '#888', fontSize: '0.8rem' }}>Avg +₹450 per cart</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', background: '#1a1a1a', padding: '20px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 800, marginBottom: '20px' }}>POLICY REJECTIONS (MARGIN PROTECTION)</div>
                    <div style={{ display: 'flex', gap: '4px', height: '60px', alignItems: 'flex-end' }}>
                      {[4, 7, 2, 8, 12, 5, 3, 9, 14, 6].map((h, i) => (
                        <div key={i} style={{ flex: 1, background: h > 10 ? 'var(--neon-pink)' : 'var(--neon-cyan)', height: `${h * 10}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
