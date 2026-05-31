import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Pusher from 'pusher-js';
import axios from 'axios';
import { getCurrentUser, getToken } from '../AuthGuard';

export default function CheckOutScreen() {

  const navigate = useNavigate();
  const user     = getCurrentUser();

  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error,   setError]   = useState(null);

  /* ── Pusher: navigate home on payment success ── */
  useEffect(() => {
    const pusher  = new Pusher('8cbe830be300102d4937', {
      cluster:      'us2',
      authEndpoint: 'http://localhost:3000/pusher/auth',
    });
    const channel = pusher.subscribe(`private-user-${user.uid}`);
    channel.bind('subscription-payment', () => {
      navigate('/pay', { replace: true });
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${user.uid}`);
    };
  }, []);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const token    = await getToken();
      const { data } = await axios.post(
        'http://localhost:3000/api/create-checkout-link',
        { email: user.email, name: user.displayName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.url) {
        chrome.tabs.create({ url: data.url });
        setWaiting(true);
      }
    } catch {
      setError('Could not create checkout link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: .3; transform: scale(.75); }
          50%      { opacity: 1;  transform: scale(1); }
        }
        .feature-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0ec;
        }
        .feature-row:last-child { border-bottom: none; }
        .checkout-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: #111;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background .15s, transform .1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .checkout-btn:hover:not(:disabled)  { background: #222; }
        .checkout-btn:active:not(:disabled) { transform: scale(.97); }
        .checkout-btn:disabled { cursor: default; background: #d1d5dc; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
          flex-shrink: 0;
        }
        .pulse-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #7c3aed;
          animation: pulse-dot 1.2s ease-in-out infinite;
        }
        .pulse-dot:nth-child(2) { animation-delay: .18s; }
        .pulse-dot:nth-child(3) { animation-delay: .36s; }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: '#f9f9f7',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e8e8e4',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#f0f0ec', border: '1px solid #e4e4e0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
              Upgrade to Pro
            </div>
            <div style={{ fontSize: 10, color: '#bbb', letterSpacing: 0.4, marginTop: 1 }}>
              Unlock unlimited emails
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ flex: 1, padding: '24px 16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Hero */}
          <div style={{
            background: '#111',
            borderRadius: 16,
            padding: '24px 20px',
            textAlign: 'center',
            animation: 'fade-up .24s ease both',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              TalkingToEleven AI Pro
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Everything you need to compose professional emails effortlessly
            </div>
          </div>

          {/* Features */}
          <div style={{
            background: '#fff',
            border: '1px solid #e8e8e4',
            borderRadius: 14,
            padding: '4px 16px',
            animation: 'fade-up .28s .04s ease both',
          }}>
            {[
              { icon: '∞', label: 'Unlimited emails per month' },
              { icon: '⚡', label: 'Priority AI processing' },
              { icon: '🎯', label: 'Advanced tone & style controls' },
              { icon: '📋', label: 'Full session history' },
            ].map(({ icon, label }) => (
              <div key={label} className="feature-row">
                <span style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: '#f5f5f3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {icon}
                </span>
                <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Waiting for payment indicator */}
          {waiting && (
            <div style={{
              background: '#fff',
              border: '1px solid #e8e8e4',
              borderRadius: 14,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              animation: 'fade-up .2s ease both',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <div className="pulse-dot" />
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
                Checkout opened in a new tab. Complete your payment to activate Pro.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: '#dc2626', textAlign: 'center', animation: 'fade-up .2s ease both' }}>
              {error}
            </p>
          )}

          {/* CTA pinned to bottom */}
          <div style={{ marginTop: 'auto' }}>
            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={loading || waiting}
            >
              {loading
                ? <><div className="spinner" />Opening checkout…</>
                : waiting
                ? 'Waiting for payment…'
                : 'Get Pro'}
            </button>
            <p style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
              Secure checkout via LemonSqueezy. Cancel anytime.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
