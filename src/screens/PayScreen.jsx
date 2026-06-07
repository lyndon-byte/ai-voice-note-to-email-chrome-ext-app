import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { getCurrentUser, getToken } from '../AuthGuard';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const CARD_BRAND_LABEL = {
  visa:       'Visa',
  mastercard: 'Mastercard',
  amex:       'Amex',
  discover:   'Discover',
};

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.3,
      background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color:      isActive ? '#16a34a'               : '#dc2626',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isActive ? '#22c55e' : '#ef4444',
        display: 'inline-block',
      }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[80, 60, 100, 60].map((w, i) => (
        <div key={i} style={{
          height: 14, width: `${w}%`, borderRadius: 6,
          background: 'linear-gradient(90deg,#f0f0ee 25%,#e4e4e0 50%,#f0f0ee 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s ease infinite',
        }} />
      ))}
    </div>
  );
}

export default function PayScreen() {

  const navigate           = useNavigate();
  const location           = useLocation();
  const user               = getCurrentUser();
  const subscriptionId     = location.state?.subscriptionId;

  const [subDetails,    setSubDetails]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelError,   setCancelError]   = useState(null);

  /* ── Pusher: real-time payment confirmation ── */
  useEffect(() => {
    const pusher  = new Pusher('8cbe830be300102d4937', {
      cluster:      'us2',
      authEndpoint: 'http://localhost:3000/pusher/auth',
    });
    const channel = pusher.subscribe(`private-user-${user.uid}`);
    channel.bind('subscription-cancel', () => {
      navigate('/checkout', { replace: true });
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${user.uid}`);
    };
  }, []);

  /* ── Fetch subscription details ── */
  useEffect(() => {
    async function loadDetails() {
      try {
        const token      = await getToken();
        const { data }   = await axios.get(
          `http://localhost:3000/api/get-subscription-on-api?subId=${subscriptionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSubDetails(data?.data ?? null);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [subscriptionId]);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const token = await getToken();
      await axios.delete('http://localhost:3000/api/cancel-subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
        data: { subId: sub?.sub_id },
      });
      setCancelConfirm(false);
      navigate('/', { replace: true });
    } catch (err) {
      setCancelError(err.response?.data?.message ?? 'Failed to cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  const sub = subDetails;


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pay-card {
          background: #fff;
          border: 1px solid #e8e8e4;
          border-radius: 14px;
          overflow: hidden;
          animation: fade-up .28s ease both;
        }
        .divider { height: 1px; background: #f0f0ec; margin: 0 16px; }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          gap: 8px;
        }
        .label { font-size: 12px; color: #9ca3af; font-weight: 500; }
        .value { font-size: 13px; color: #111; font-weight: 600; }
        .link-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600;
          color: #7c3aed;
          font-family: inherit;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .link-btn:hover { color: #6d28d9; }
        .cancel-btn {
          padding: 7px 14px;
          border-radius: 8px;
          border: none;
          background: #dc2626;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background .15s;
          animation: fade-up .32s .08s ease both;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .cancel-btn:hover { background: #b91c1c; }
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
            onClick={() => navigate('/')}
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
              Subscription
            </div>
            <div style={{ fontSize: 10, color: '#bbb', letterSpacing: 0.4, marginTop: 1 }}>
              Manage your plan
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {loading ? (
            <div className="pay-card"><Skeleton /></div>

          ) : sub ? (
            <>
              {/* ── Plan card ── */}
              <div className="pay-card">

                {/* Purple gradient accent */}
                <div style={{ height: 4, background: '#111' }} />

                {/* Plan hero */}
                <div style={{
                  padding: '18px 16px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
                        {sub.product_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        #{sub.sub_id}
                      </div>
                    </div>
                    
                  </div>
                  <StatusBadge status={sub.status} />
                </div>

                <div className="divider" />

                {/* Payment method */}
                <div className="row">
                  <div>
                    <div className="label">Payment method</div>
                    <div className="value" style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="20" height="14" viewBox="0 0 32 22" fill="none"
                        style={{ flexShrink: 0 }}>
                        <rect width="32" height="22" rx="3" fill="#1a1f71"/>
                        <rect y="6" width="32" height="6" fill="#f7b600"/>
                        <rect x="3" y="15" width="8" height="3" rx="1" fill="#fff" opacity=".7"/>
                      </svg>
                      {CARD_BRAND_LABEL[sub.card_brand] ?? sub.card_brand} •••• {sub.card_last_four}
                    </div>
                  </div>
                  <button
                    className="link-btn"
                    onClick={() => window.open(sub.update_payment_url, '_blank')}
                  >
                    Update
                  </button>
                </div>

              </div>

              {/* ── Cancel section ── */}
              <div style={{
                background: '#fff',
                border: '1px solid #e8e8e4',
                borderRadius: 14,
                padding: '16px',
                animation: 'fade-up .3s .06s ease both',
              }}>
                <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginBottom: 8 }}>
                  Danger zone
                </div>
                <p style={{ fontSize: 11, color: '#ef4444', lineHeight: 1.5, fontWeight: 500, marginBottom: 10 }}>
                  Cancellation is immediate — you will lose Pro access right away.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="cancel-btn" onClick={() => setCancelConfirm(true)}>
                    Cancel subscription
                  </button>
                </div>
              </div>
            </>

          ) : (
            /* ── No data fallback ── */
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingTop: 60,
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
                stroke="#d1d5db" strokeWidth="1.4">
                <rect x="4" y="6" width="28" height="24" rx="4"/>
                <line x1="4" y1="13" x2="32" y2="13"/>
                <line x1="9" y1="19" x2="16" y2="19"/>
              </svg>
              <p style={{ fontSize: 14, color: '#9ca3af' }}>No subscription found</p>
            </div>
          )}
        </div>

        {/* ── Cancel confirmation modal ── */}
        {cancelConfirm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.5)',
            animation: 'fade-up .18s ease both',
          }}>
            <div style={{
              width: '100%', maxWidth: 340,
              background: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0,0,0,.2)',
            }}>
              {/* Red accent */}
              <div style={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#f87171)' }} />

              <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
                {/* Warning icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                  Cancel subscription?
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, marginBottom: 20 }}>
                  Your Pro access will be removed immediately. This cannot be undone.
                </div>

                <button
                  onClick={() => setCancelConfirm(false)}
                  style={{
                    display: 'block', width: '100%',
                    padding: '11px 0',
                    borderRadius: 8, border: '1px solid #e8e8e4',
                    background: '#fff', color: '#111',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  Keep subscription
                </button>

                {cancelError && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginBottom: 8, lineHeight: 1.4 }}>
                    {cancelError}
                  </p>
                )}

                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 8, border: 'none',
                    background: cancelling ? '#f87171' : '#dc2626', color: '#fff',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: 'inherit', cursor: cancelling ? 'default' : 'pointer',
                    transition: 'background .15s',
                  }}
                >
                  {cancelling && (
                    <span style={{
                      width: 13, height: 13, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,.35)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin .7s linear infinite',
                    }} />
                  )}
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
