"use client";

import React from 'react';

interface RecommendationProps {
  data: {
    segment: any;
    offer: any;
    campaign: any;
  } | null;
}

export default function ActionableRecommendation({ data }: RecommendationProps) {
  if (!data) return null;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '25px', border: '1px solid var(--accent-purple-glow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px', color: '#fff' }}>Recommended Action</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Based on recent agent analysis</p>
        </div>
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
          High Confidence
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '5px' }}>Target Segment</h4>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-blue)' }}>{data.segment.name}</p>
          <p style={{ fontSize: '0.85rem', color: '#ccc', marginTop: '5px' }}>{data.segment.count} users</p>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '5px' }}>Offer Selected</h4>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-purple)' }}>{data.offer.offer}</p>
          <p style={{ fontSize: '0.85rem', color: '#ccc', marginTop: '5px' }}>Est. Conv: {data.offer.predictedConversion}</p>
        </div>
      </div>

      <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--accent-blue)' }}>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Campaign Strategy</h4>
        <p style={{ fontSize: '0.9rem', marginBottom: '5px' }}><strong>Channel:</strong> {data.campaign.channel}</p>
        <p style={{ fontSize: '0.9rem', marginBottom: '5px' }}><strong>Optimal Time:</strong> {data.campaign.bestTime}</p>
        <p style={{ fontSize: '0.9rem' }}><strong>Message:</strong> "{data.campaign.content}"</p>
      </div>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary">Dismiss</button>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Launch Campaign</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
