import { useEffect, useState, } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import { Loader } from '../components/Loader';
import axios from 'axios';
import { getToken,getCurrentUser } from '../AuthGuard';

// ─── Global styles ────────────────────────────────────────────────────────────
const globalStyles = `

  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body { height: 100%; }
  body { background: #f5f5f0; font-family: 'Plus Jakarta Sans', sans-serif; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d0d0cc; border-radius: 99px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseDot {
    0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
    40%            { opacity: 1;   transform: scale(1); }
  }
  @keyframes waveBar {
    0%, 100% { height: 3px; }
    50%       { height: 16px; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  .bubble-in { animation: fadeUp 0.3s cubic-bezier(.16,1,.3,1) both; }

  .dot-1 { animation: pulseDot 1.2s ease-in-out infinite 0s; }
  .dot-2 { animation: pulseDot 1.2s ease-in-out infinite 0.18s; }
  .dot-3 { animation: pulseDot 1.2s ease-in-out infinite 0.36s; }

  .wave-bar { animation: waveBar 0.85s ease-in-out infinite; }
  .wave-bar:nth-child(2) { animation-delay: 0.1s; }
  .wave-bar:nth-child(3) { animation-delay: 0.2s; }
  .wave-bar:nth-child(4) { animation-delay: 0.3s; }
  .wave-bar:nth-child(5) { animation-delay: 0.15s; }
  .wave-bar:nth-child(6) { animation-delay: 0.25s; }
  .wave-bar:nth-child(7) { animation-delay: 0.05s; }

  .cursor-blink { animation: blink 0.9s step-end infinite; }

  .send-btn { transition: background 0.15s, transform 0.1s; }
  .send-btn:active { transform: scale(0.92); }
  .send-btn:hover:not(:disabled) { background: #1a1a1a !important; }

  textarea { outline: none; }

  input[type=range] {
    -webkit-appearance: none;
    appearance: none;
    height: 3px;
    background: #e4e4e0;
    border-radius: 99px;
    cursor: pointer;
    width: 100%;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #111;
    cursor: pointer;
  }
`;


export default function EmailScreen() {

  const location = useLocation(); 
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken]  = useState(null);
  const [chatId,setChatId] = useState(location.state?.chatId)
  const [isPro, setIsPro] = useState(false);
  const [subscriptionId,setSubscriptionId] = useState(null)


  const previousPage = location.state?.previousPage ?? null;

  const user = getCurrentUser();

  useEffect(() => {
    
    async function loadData() {

      try {

        const token = await getToken();
        setAuthToken(token)

        const { data } = await axios.get(`http://localhost:3000/api/messages?chatId=${chatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInitialData(data);

      } finally {

        setLoading(false);
        
      }
    }
    loadData();

  }, [chatId]);


  useEffect(() => {

    async function checkSubscription() {
      const token = await getToken();
      const { data } = await axios.get(`http://localhost:3000/api/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsPro(data?.data?.status === 'active');
      setSubscriptionId(data?.data?.subscriptionId)
    }

    checkSubscription();

  }, [])

  if (loading) return <Loader color='bg-gray-900'/>;

  return (
    <>
      <style>{globalStyles}</style>

      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f5f0',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <header style={{
          padding: '11px 14px',
          borderBottom: '1px solid #e8e8e4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          flexShrink: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Back button */}
            <button
              onClick={() => navigate('/',{state: { page: previousPage }})}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#f0f0ec', border: '1px solid #e4e4e0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e4e4e0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f0f0ec'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
 
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.2, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Mail Composer
              </div>
              <div 
               className='text-gray-800'
               style={{ fontSize: 10,fontFamily: 'DM Mono, monospace', letterSpacing: 0.4, marginTop: 1 }}>
                {isPro ? 'Pro plan' : 'Free plan'}
              </div>
            </div>
          </div>
 
          <button
            onClick={() => {
              if (isPro) {
                navigate('/pay', { state: { subscriptionId } });
              } else {
                navigate('/checkout');
              }
            }}
            style={{
              padding: '4px 11px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              transition: 'opacity .15s, transform .12s',
              ...(isPro
                ? {
                    background: '#111',
                    color: '#fff',
                  }
                : {
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    color: '#fff',
                  }),
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPro ? 'Pro' : 'Upgrade to Pro'}
          </button>
        </header>

        <ChatBox 
          chatId={chatId} 
          initialMessages={initialData} 
          token={authToken} 
          handleNewSession={(id) => { 

            setLoading(true)
            setChatId(id)
          
          }}
        />
        
      </div>
    </>
  );
}