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
    channel.bind('subscription-payment', (e) => {
      navigate('/pay', { state: { subscriptionId: e.subscriptionId } });
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

  useEffect(() => {

      console.log(user)

  },[user])

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
          padding: 11px;
          border-radius: 10px;
          border: 1.5px solid #111;
          background: transparent;
          color: #111;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background .15s, color .15s, transform .1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .checkout-btn:hover:not(:disabled)  { background: #111; color: #fff; }
        .checkout-btn:active:not(:disabled) { transform: scale(.97); }
        .checkout-btn:disabled { cursor: default; border-color: #d1d5dc; color: #d1d5dc; background: transparent; }
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 12px',
        position: 'relative',
      }}>

        {/* ── Back button (top-left) ── */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: 12, left: 12,
            width: 28, height: 28, borderRadius: '50%',
            background: '#f0f0ec', border: '1px solid #e4e4e0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* ── Centered content ── */}
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Header text */}
          <div style={{ textAlign: 'center', marginBottom: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
              Upgrade to Pro
            </div>
            <div style={{ fontSize: 9, color: '#364153', letterSpacing: 0.4, marginTop: 2 }}>
              Unlock unlimited emails
            </div>
          </div>

          {/* Hero */}
          <div style={{
            background: '#111',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'center',
            animation: 'fade-up .24s ease both',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              TalkingToEleven AI Pro
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              Unlimited email generations per month
            </div>
          </div>

          {/* Waiting for payment indicator */}
          {waiting && (
            <div style={{
              background: '#fff',
              border: '1px solid #e8e8e4',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              animation: 'fade-up .2s ease both',
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <div className="pulse-dot" />
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.4 }}>
                Checkout opened in a new tab. Complete your payment to activate Pro.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: 11, color: '#dc2626', textAlign: 'center', animation: 'fade-up .2s ease both' }}>
              {error}
            </p>
          )}

          {/* CTA */}
          <div>
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
            <p style={{ fontSize: 10, color: '#364153', textAlign: 'center', marginTop: 6, lineHeight: 1.4 }}>
              Secure checkout via LemonSqueezy. Cancel anytime.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
