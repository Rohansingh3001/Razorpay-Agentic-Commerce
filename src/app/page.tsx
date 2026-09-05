'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const features = [
  {
    number: '01',
    label: 'AI-readable catalog',
    title: 'Structured Commerce',
    description: 'Expose your products, prices, inventory, and compatibility directly to AI buyers.',
    className: 'feature-cyan',
  },
  {
    number: '02',
    label: 'Agentic cart',
    title: 'Contextual Upsells',
    description: 'The AI doesn’t just recommend products; it logically builds the cart and identifies relevant add-ons.',
    className: 'feature-pink',
  },
  {
    number: '03',
    label: 'Trust & Safety',
    title: 'Policy Engine',
    description: 'The AI can reason and propose. But the backend independently verifies the actual price, inventory, and authorization limits.',
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
    label: 'Audit trail',
    title: 'Observable Decisions',
    description: 'Keep every recommendation, tool call, and transaction visible and bounded for the user.',
    className: 'feature-pink',
  },
];

export default function LandingPage() {
  const [activeMockup, setActiveMockup] = useState<string | null>(null);

  return (
    <div className="landing-shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="RazorBuy home">
          <span>Razor</span><strong>Buy</strong>
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
            <h1>Make your store <span className="text-highlight">AI-buyable.</span></h1>
            <p className="hero-description">
              Build, test, and govern agentic commerce layers that make merchants readable, discoverable, and transactable by AI buyers.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn btn-primary btn-large">Start building <span aria-hidden="true">→</span></Link>
              <a href="#features" className="text-link">Explore the system <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-proof">
              <span><b>01</b> AI-readable catalog</span>
              <span><b>02</b> Agentic cart</span>
              <span><b>03</b> Policy Engine</span>
              <span><b>04</b> Voice checkout</span>
              <span><b>05</b> Explainable audit trail</span>
            </div>
          </div>

          <div className="hero-console animate-snap" aria-label="Agent workspace preview">
            <div className="console-topbar">
              <div className="window-controls"><i /><i /><i /></div>
              <span>AGENT_WORKSPACE / 01</span>
              <span className="console-live"><i /> LIVE</span>
            </div>
            <div className="console-body">
              <div className="console-label">AI Buyer Agent <span>v2.4</span></div>
              <div className="console-command">I need headphones for work calls under ₹4,000<span className="cursor" /></div>
              <div className="console-divider" />
              <div className="console-result">
                <div className="result-icon">↗</div>
                <div><strong>Purchase Proposed</strong><small>Cart built · Policy verified</small></div>
                <span className="result-check">✓</span>
              </div>
              <div className="console-metrics">
                <div><small>UPSELL ACCEPTED</small><strong>+₹299</strong></div>
                <div><small>POLICY STATUS</small><strong className="green-text">APPROVED</strong></div>
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
              <h2 style={{ color: '#f3f1eb' }}>Phase 2: The Future of<br /><em style={{ color: '#eb3b85' }}>RazorBuy</em></h2>
            </div>
            <p style={{ color: '#aaa' }}>A sneak peek at the next evolution of our infrastructure, featuring multi-agent swarms, voice AI, and strict policy gating.</p>
          </div>
          <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            
            <article className="feature-card" onClick={() => setActiveMockup('whatsapp')} style={{ backgroundColor: '#1a1a1a', borderColor: '#333', boxShadow: '6px 6px 0 #56d7d3', cursor: 'pointer' }}>
              <div className="feature-number" style={{ borderColor: '#333', color: '#56d7d3' }}>01</div>
              <div className="feature-content">
                <span className="feature-label" style={{ color: '#56d7d3' }}>Omnichannel</span>
                <h3 style={{ color: '#fff' }}>WhatsApp Checkout</h3>
                <p style={{ color: '#aaa' }}>Let the AI buyer build carts directly in WhatsApp, dropping a secure Razorpay link right in the chat.</p>
              </div>
              <span className="feature-arrow" aria-hidden="true" style={{ color: '#56d7d3' }}>💬</span>
            </article>

            <article className="feature-card" onClick={() => setActiveMockup('policy')} style={{ backgroundColor: '#1a1a1a', borderColor: '#333', boxShadow: '6px 6px 0 #eb3b85', cursor: 'pointer' }}>
              <div className="feature-number" style={{ borderColor: '#333', color: '#eb3b85' }}>02</div>
              <div className="feature-content">
                <span className="feature-label" style={{ color: '#eb3b85' }}>Safe Autonomy</span>
                <h3 style={{ color: '#fff' }}>Policy Engine Block</h3>
                <p style={{ color: '#aaa' }}>See how RazorBuy independently blocks transactions if prices drift or authorization limits are exceeded.</p>
              </div>
              <span className="feature-arrow" aria-hidden="true" style={{ color: '#eb3b85' }}>🛡️</span>
            </article>

          </div>
        </section>
      </main>

      <footer className="site-footer"><span>RAZORBUY / PLATFORM PREVIEW</span><span>© {new Date().getFullYear()} <b>RAZORPAY</b></span></footer>
      
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

              {activeMockup === 'policy' && (
                <div style={{ display: 'flex', width: '100%', gap: '20px', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ color: '#ffdf38', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Transaction Intercepted</div>
                    <div><small style={{ color: '#888' }}>AGENT QUOTE</small><strong style={{ display: 'block', color: '#fff', fontSize: '1.2rem' }}>₹3,499</strong></div>
                    <div><small style={{ color: '#888' }}>LIVE MERCHANT PRICE</small><strong style={{ display: 'block', color: 'var(--neon-pink)', fontSize: '1.2rem' }}>₹3,799</strong></div>
                    <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(255,0,255,0.1)', borderLeft: '2px solid var(--neon-pink)', fontSize: '0.7rem', color: 'var(--neon-pink)', fontFamily: 'JetBrains Mono' }}>POLICY DECISION: BLOCKED</div>
                  </div>
                  <div style={{ flex: 1.5, background: '#1a1a1a', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="chat-bubble-user" style={{ padding: '12px', alignSelf: 'flex-end', fontSize: '0.85rem' }}>Proceed with checkout for the headphones.</div>
                    <div className="chat-bubble-agent" style={{ padding: '12px', alignSelf: 'flex-start', fontSize: '0.85rem' }}>The merchant price changed before payment. I haven't charged you. The current price is ₹3,799. Would you like to continue?</div>
                    <div style={{ background: '#000', border: '1px solid #333', padding: '12px', textAlign: 'center', marginTop: '8px' }}>
                      <div style={{ color: 'var(--neon-pink)', fontWeight: 'bold', fontSize: '1.4rem' }}>TRANSACTION BLOCKED</div>
                      <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '4px' }}>Safe Autonomy in Action</div>
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
