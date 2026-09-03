import React from 'react';
import Link from 'next/link';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="login-shell">
      <Link href="/" className="login-back btn btn-secondary">[←] BACK_TO_HOME</Link>
      <div className="login-layout">
        <section className="login-context">
          <span className="section-kicker">Pravah Pay / Access</span>
          <h1>Commerce,<br /><em>in motion.</em></h1>
          <p>Sign in to your secure workspace and turn a buyer&apos;s intent into a governed transaction.</p>
          <div className="login-context-meta"><span><i /> TEST MODE ACTIVE</span><span>BUILD 2.4.0</span></div>
        </section>
        <section className="login-card animate-snap">
          <div className="login-card-heading">
            <div className="login-brand">Agentic<span>Commerce</span></div>
            <p>SYS_AUTH_REQUIRED</p>
          </div>
          <LoginForm />
          <div className="login-footnote"><span>ENCRYPTED SESSION</span><span>RZP / AUTH GATE</span></div>
        </section>
      </div>
    </div>
  );
}
