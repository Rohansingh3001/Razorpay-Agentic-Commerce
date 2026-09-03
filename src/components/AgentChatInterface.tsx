import React, { useState, useRef, useEffect } from 'react';

interface ChatProps {
  addLog: (tool: string, args: any, result?: any) => void;
}

type ToolCall = {
  name: string;
  args: any;
  result: any;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
};

export default function AgentChatInterface({ addLog }: ChatProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [paymentModal, setPaymentModal] = useState<{ link: string; amount: number; id?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<Record<string, any>>({});
  const requestStatusRef = useRef<Record<string, any>>({});
  const paidRequestsRef = useRef<Set<string>>(new Set());
  const [attemptedPayments, setAttemptedPayments] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('agentic_session_id');
    if (!storedSessionId) {
      const newSessionId = `buyer_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('agentic_session_id', newSessionId);
      setSessionId(newSessionId);
    } else {
      setSessionId(storedSessionId);
    }

    const storedMessages = localStorage.getItem('agentic_messages');
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (e) {
        setMessages([{ role: 'assistant', content: 'SYS_INIT: Merchant AI Online. Awaiting commands.' }]);
      }
    } else {
      setMessages([{ role: 'assistant', content: 'SYS_INIT: Merchant AI Online. Awaiting commands.' }]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('agentic_messages', JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const waitForMerchantApproval = async (purchaseRequestId: string) => {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      const response = await fetch(`/api/purchase/status/${purchaseRequestId}?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      if (!response.ok) continue;
      const status = await response.json();
      
      setRequestStatus(prev => ({ ...prev, [purchaseRequestId]: status }));

      if (status.payment_status === 'paid') {
        if (paidRequestsRef.current.has(purchaseRequestId)) return;
        paidRequestsRef.current.add(purchaseRequestId);
        setPaymentModal(null);
        setMessages(msgs => [...msgs, {
          role: 'assistant',
          content: `✅ **Payment Confirmed!** Your order (ID: \`${purchaseRequestId.split('-')[0]}\`) has been successfully processed and will be delivered in 3-5 business days. Thank you for shopping with us!`
        }]);
        return;
      }

      if (status.approval_status === 'rejected' || status.policy_decision === 'BLOCKED') {
        return;
      }
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input.trim();
    if (!textToSend || isLoading) return;
    
    if (!overrideText) {
      setInput('');
    }
    
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history: messages, sessionId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (data.tool_calls) {
          for (const call of data.tool_calls) {
            addLog(call.name, call.args, call.result);
          }
        }
        if (data.purchase_request_id) {
          void waitForMerchantApproval(data.purchase_request_id);
        }
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, tool_calls: data.tool_calls }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'ERR: INTERNAL_SYS_FAILURE' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'ERR: NETWORK_DISCONNECT' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderToolCall = (call: ToolCall, idx: number) => {
    if (call.name === 'search_products') {
      const products = call.result?.products || [];
      return (
        <div key={idx} className="product-results" style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', paddingBottom: '8px', width: '100%' }}>
          {products.map((p: any) => (
            <div key={p.id} className="brutal-card" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--neon-pink)', fontWeight: 800 }}>{p.category}</div>
                <h4 style={{ margin: '4px 0 8px 0', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</h4>
                <div style={{ fontSize: '0.8rem', marginBottom: '8px', flex: 1 }}>{p.description}</div>
                <div style={{ fontWeight: 800, fontFamily: 'JetBrains Mono', marginBottom: '12px' }}>₹{p.price}</div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px', marginTop: 'auto' }}
                  onClick={() => handleSend(`Add ${p.name} to my cart`)}
                >
                  ADD TO CART
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (call.name === 'recommend_upsell') {
      const p = call.result?.recommendation;
      if (!p) return null;
      return (
        <div key={idx} className="brutal-panel" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px', border: 'var(--border-heavy)', borderColor: 'var(--neon-cyan)', background: 'var(--black)', color: 'var(--white)' }}>
          <div style={{ fontSize: '2rem' }}>✨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 800, textTransform: 'uppercase' }}>Recommended Add-on</div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{p.name}</h4>
            <div style={{ fontFamily: 'JetBrains Mono', marginTop: '4px' }}>₹{p.price}</div>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ fontSize: '0.8rem', padding: '8px 16px', background: 'var(--neon-cyan)' }}
            onClick={() => handleSend(`Yes, add the ${p.name} to my cart too.`)}
          >
            ADD
          </button>
        </div>
      );
    }

    if (call.name === 'get_quote') {
      const items = call.result?.items || [];
      const total = call.result?.authoritative_total || 0;
      const discountPercent = call.result?.discount_percent || 0;
      const discountAmount = call.result?.discount_amount || 0;
      return (
        <div key={idx} className="brutal-panel" style={{ marginTop: '16px', padding: '16px', width: '100%', maxWidth: '400px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', borderBottom: 'var(--border-medium)', paddingBottom: '8px', textTransform: 'uppercase' }}>Authoritative Quote</div>
          {items.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ paddingRight: '8px' }}>{item.name}</div>
                <div style={{ fontWeight: 800 }}>₹{item.price * item.quantity}</div>
              </div>
              {discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--neon-pink)', fontWeight: 800 }}>
                  <span>RETENTION OFFER ({discountPercent}%)</span><span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: 'var(--border-medium)', paddingTop: '8px' }}>
                <span>TOTAL</span><span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                <button 
                  className="btn" 
                  style={{ padding: '2px 10px', fontSize: '1rem', background: 'var(--black)', color: 'var(--white)', border: '1px solid var(--white)', cursor: 'pointer' }}
                  onClick={() => handleSend(item.quantity > 1 ? `Decrease quantity of ${item.name} to ${item.quantity - 1}` : `Remove ${item.name} from cart`)}
                >
                  -
                </button>
                <span style={{ fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                <button 
                  className="btn" 
                  style={{ padding: '2px 10px', fontSize: '1rem', background: 'var(--black)', color: 'var(--white)', border: '1px solid var(--white)', cursor: 'pointer' }}
                  onClick={() => handleSend(`Increase quantity of ${item.name} to ${item.quantity + 1}`)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '8px', borderTop: 'var(--border-medium)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--neon-pink)' }}>
            <span>TOTAL</span>
            <span>₹{total}</span>
          </div>
          {items.length > 0 && (
             <button 
               className="btn btn-primary" 
               style={{ width: '100%', fontSize: '0.9rem', padding: '12px', marginTop: '16px', background: 'var(--black)', color: 'var(--neon-yellow)' }}
               onClick={() => handleSend(`Proceed and checkout`)}
             >
               CHECKOUT
             </button>
          )}
        </div>
      );
    }

    if (call.name === 'collect_shipping_address') {
      return (
        <div key={idx} className="brutal-panel" style={{ marginTop: '16px', padding: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px', border: '2px solid var(--neon-cyan)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--neon-cyan)' }}>Confirm Shipping Details</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Please review and confirm your delivery address before we request the purchase.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
             <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>FULL NAME</label>
             <input type="text" className="brutal-input" defaultValue="Demo User" id={`name-${idx}`} />
             
             <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>DELIVERY ADDRESS</label>
             <textarea className="brutal-input" defaultValue="123 AI Street, Tech Park, Bangalore 560001" id={`address-${idx}`} rows={3} style={{ resize: 'none' }} />
             
             <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>PHONE NUMBER</label>
             <input type="text" className="brutal-input" defaultValue="+91 9876543210" id={`phone-${idx}`} />
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', fontSize: '0.9rem', padding: '12px', marginTop: '8px', background: 'var(--neon-cyan)', color: 'var(--black)' }}
            onClick={() => {
              const name = (document.getElementById(`name-${idx}`) as HTMLInputElement)?.value;
              const addr = (document.getElementById(`address-${idx}`) as HTMLTextAreaElement)?.value;
              const phone = (document.getElementById(`phone-${idx}`) as HTMLInputElement)?.value;
              handleSend(`Confirmed shipping address:\nName: ${name}\nAddress: ${addr}\nPhone: ${phone}\n\nPlease call the request_purchase tool now with this address.`);
            }}
          >
            CONFIRM & PROCEED
          </button>
        </div>
      );
    }

    if (call.name === 'request_purchase') {
      const { policy_decision, proposed_total, purchase_request_id } = call.result;
      if (!purchase_request_id) return null;
      
      const liveStatus = requestStatus[purchase_request_id];
      const isApproved = liveStatus?.approval_status === 'approved';
      const isRejected = liveStatus?.approval_status === 'rejected';
      
      let badgeColor = 'var(--neon-yellow)';
      if (policy_decision === 'APPROVED' || isApproved) badgeColor = 'var(--neon-green)';
      if (policy_decision === 'BLOCKED' || isRejected) badgeColor = 'var(--neon-pink)';
      
      return (
        <div key={idx} className="brutal-panel" style={{ marginTop: '16px', padding: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', background: badgeColor, padding: '4px 8px', display: 'inline-block', alignSelf: 'flex-start', border: 'var(--border-medium)' }}>
            POLICY: {isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : policy_decision}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
            <div>Request ID: {purchase_request_id.split('-')[0]}...</div>
            <div>Total: ₹{proposed_total}</div>
          </div>
          
          {(policy_decision === 'REQUIRE_APPROVAL' && !isApproved && !isRejected) && (
            <div style={{ marginTop: '8px', padding: '12px', border: 'var(--border-medium)', background: 'var(--bg-base)' }}>
              <div style={{ fontWeight: 800, marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Awaiting payment approval</div>
              <p style={{ fontSize: '0.8rem', marginBottom: '12px', color: 'var(--text-muted)' }}>The request is waiting for merchant review. No payment link has been created yet.</p>
              <div style={{ padding: '10px', background: 'var(--white)', border: 'var(--border-medium)', fontFamily: 'JetBrains Mono', fontSize: '0.72rem', fontWeight: 700 }}>
                MERCHANT_REVIEW_IN_PROGRESS
              </div>
            </div>
          )}
          
          {isApproved && liveStatus?.payment_link && (
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', fontSize: '0.9rem', padding: '12px', marginTop: '8px', background: 'var(--neon-cyan)', color: 'var(--black)' }}
              onClick={() => {
                setAttemptedPayments(prev => new Set(prev).add(purchase_request_id));
                setPaymentModal({ link: liveStatus.payment_link, amount: liveStatus.amount, id: purchase_request_id });
                void waitForMerchantApproval(purchase_request_id);
              }}
            >
              {attemptedPayments.has(purchase_request_id) ? 'RETRY PAYMENT' : 'PAY NOW'}
            </button>
          )}
          
          {isRejected && (
            <div style={{ marginTop: '8px', padding: '12px', border: 'var(--border-medium)', background: 'var(--bg-base)', color: 'var(--neon-pink)' }}>
              <div style={{ fontWeight: 800 }}>Request Rejected</div>
              <div style={{ fontSize: '0.8rem' }}>{liveStatus?.reason || 'Merchant rejected the request.'}</div>
            </div>
          )}
        </div>
      );
    }

    if (call.name === 'initiate_checkout') {
      return (
        <div key={idx} className="brutal-panel" style={{ marginTop: '16px', padding: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
           <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', background: 'var(--neon-green)', padding: '4px 8px', display: 'inline-block', alignSelf: 'flex-start' }}>Payment Link Generated</div>
           <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
             <div>Razorpay ID: {call.result?.payment_link_id}</div>
             <div>Amount: ₹{call.result?.amount}</div>
           </div>
           {call.result?.payment_link && (
             <button onClick={() => {
               setPaymentModal({ link: call.result.payment_link, amount: call.result.amount, id: call.result.payment_link_id });
             }} className="btn btn-primary" style={{ background: 'var(--neon-cyan)' }}>
               OPEN CHECKOUT HERE
             </button>
           )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem' }}>
      <div style={{ paddingBottom: '1.5rem', borderBottom: 'var(--border-heavy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
          AGENTIC_COMMERCE
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--black)', color: 'var(--neon-yellow)', padding: '4px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', fontWeight: 'bold' }}>
          <div style={{ width: 8, height: 8, background: 'var(--neon-green)', borderRadius: '0' }} />
          LINK_SECURE
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className="animate-snap" style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'} style={{
              maxWidth: '85%',
              padding: '16px',
              fontFamily: 'Space Grotesk',
              fontWeight: 600,
              fontSize: '1rem',
              lineHeight: 1.4,
            }}>
              {msg.role === 'assistant' && (
                <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>SYS_MSG //</div>
              )}
              {msg.role === 'user' && (
                <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>USER_INPUT //</div>
              )}
              <RichMessage content={msg.content} />
            </div>
            
            {/* Render any inline tools called during this turn */}
            {msg.tool_calls && msg.tool_calls.map((call, i) => renderToolCall(call, i))}
            
          </div>
        ))}
        {isLoading && (
          <div className="animate-snap" style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="chat-bubble-agent" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>PROCESSING</div>
              <div className="typing-block" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

        {paymentModal && (
          <div className="payment-modal-backdrop" role="dialog" aria-modal="true" aria-label="Razorpay checkout">
            <div className="payment-modal">
              <div className="payment-modal-header">
                <div><span>RAZORPAY SECURE CHECKOUT</span><strong>₹{paymentModal.amount.toLocaleString('en-IN')}</strong></div>
                <button className="payment-modal-close" onClick={async () => {
                  const prId = paymentModal.id;
                  setPaymentModal(null);
                  if (prId) {
                    try {
                      const res = await fetch(`/api/purchase/status/${prId}?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
                      const st = await res.json();
                      if (st.payment_status === 'paid') {
                        if (paidRequestsRef.current.has(prId)) return;
                        paidRequestsRef.current.add(prId);
                        setMessages(msgs => [...msgs, {
                          role: 'assistant',
                          content: `✅ **Payment Confirmed!** Your order (ID: \`${prId.split('-')[0]}\`) has been successfully processed and will be delivered in 3-5 business days. Thank you for shopping with us!`
                        }]);
                        return;
                      }
                    } catch(e) {}
                  }
                  setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ **Payment cancelled or failed.** You can retry when you are ready by clicking "PAY NOW / RETRY" again.' }]);
                }} aria-label="Close checkout">×</button>
              </div>
              <iframe title="Razorpay payment checkout" src={paymentModal.link} className="payment-frame" />
              <div className="payment-modal-footer">PAYMENT IS PROCESSED BY RAZORPAY TEST MODE</div>
            </div>
          </div>
        )}

        <div style={{ paddingTop: '1rem', position: 'relative', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="brutal-input" 
              placeholder={!isInitialized ? "Loading session..." : isLoading ? "PROCESSING..." : isListening ? "LISTENING... (Speak now)" : "ENTER_COMMAND..."}
              style={{ width: '100%', paddingRight: '140px', background: isListening ? '#ffeaf5' : 'var(--white)' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading || !isInitialized}
            />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (isListening) return; // Native API automatically stops after speech
                  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRec) {
                    alert('Speech Recognition is not supported in this browser. Please use Chrome/Edge.');
                    return;
                  }
                  const recognition = new SpeechRec();
                  recognition.lang = 'en-US';
                  recognition.interimResults = true;
                  
                  recognition.onstart = () => setIsListening(true);
                  recognition.onresult = (event: any) => {
                    let transcript = '';
                    for (let i = 0; i < event.results.length; i += 1) {
                      transcript += event.results[i][0].transcript;
                    }
                    setInput(transcript);
                  };
                  recognition.onerror = () => setIsListening(false);
                  recognition.onend = () => setIsListening(false);
                  recognition.start();
                }}
                disabled={isLoading || !isInitialized}
                title="Voice to Commerce"
                style={{
                  background: isListening ? 'var(--neon-pink)' : 'var(--white)',
                  border: 'var(--border-medium)',
                  color: isListening ? 'var(--white)' : 'var(--text-muted)',
                  cursor: isLoading ? 'default' : 'pointer',
                  padding: '8px 12px',
                  fontFamily: 'JetBrains Mono',
                  animation: isListening ? 'blink 1.5s infinite alternate' : 'none'
                }}
              >
                🎙️
              </button>
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim() || !isInitialized}
                style={{ 
                  background: input.trim() ? 'var(--black)' : 'var(--white)', 
                  border: 'var(--border-medium)',
                  color: input.trim() ? 'var(--neon-yellow)' : 'var(--text-muted)',
                  cursor: input.trim() ? 'pointer' : 'default', 
                  padding: '8px 16px',
                  fontFamily: 'JetBrains Mono', fontWeight: 800
                }}
              >
                EXEC
              </button>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            title="Clear Chat History"
            onClick={() => {
              if (window.confirm('Clear chat history?')) {
                localStorage.removeItem('agentic_messages');
                localStorage.removeItem('agentic_session_id');
                window.location.reload();
              }
            }}
            style={{ padding: '0 15px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            🗑️
          </button>
        </div>
      </div>
  );
}

function RichMessage({ content }: { content?: string | null }) {
  if (!content) return null;
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="rich-message">
      {blocks.map((block, index) => (
        <p key={index}>
          {block.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={partIndex}>{part.slice(1, -1)}</code>;
            }
            return <React.Fragment key={partIndex}>{part}</React.Fragment>;
          })}
        </p>
      ))}
    </div>
  );
}
