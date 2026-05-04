import { useEffect, useState, useRef } from 'react'
import { useLocation, Navigate } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { parse } from 'partial-json';
import { getToken } from '../AuthGuard';

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

// ─── Cursor ───────────────────────────────────────────────────────────────────
const Cursor = () => (
  <span
    className="cursor-blink"
    style={{
      display: 'inline-block', width: 2, height: '1em',
      background: '#333', marginLeft: 2,
      verticalAlign: 'text-bottom', borderRadius: 1,
    }}
  />
);

// ─── Wave bars ────────────────────────────────────────────────────────────────
const WaveBars = ({ color = '#111' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
    {[...Array(7)].map((_, i) => (
      <div
        key={i} className="wave-bar"
        style={{ width: 3, height: 3, background: color, borderRadius: 99, transformOrigin: 'center' }}
      />
    ))}
  </div>
);

// ─── Thinking dots ────────────────────────────────────────────────────────────
const ThinkingDots = () => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
    {['dot-1', 'dot-2', 'dot-3'].map(c => (
      <div key={c} className={c} style={{ width: 7, height: 7, borderRadius: '50%', background: '#bbb' }} />
    ))}
  </div>
);

// ─── Audio player ─────────────────────────────────────────────────────────────
const AudioBubble = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 190, maxWidth: 250 }}>
      <audio
        ref={audioRef} src={audioUrl}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#111', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'opacity 0.15s',
        }}
      >
        {playing
          ? <svg width="10" height="13" viewBox="0 0 10 13" fill="#fff"><rect x="0" y="0" width="3.5" height="13" rx="1.5"/><rect x="6.5" y="0" width="3.5" height="13" rx="1.5"/></svg>
          : <svg width="11" height="13" viewBox="0 0 11 13" fill="#fff"><polygon points="0,0 11,6.5 0,13"/></svg>
        }
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          type="range" min={0} max={duration || 1} step={0.01} value={progress}
          onChange={e => { audioRef.current.currentTime = +e.target.value; setProgress(+e.target.value); }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999', fontFamily: 'DM Mono, monospace' }}>
          <span>{fmt(progress)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Email card ───────────────────────────────────────────────────────────────
const EmailCard = ({ subject, body, streaming }) => (
  <div style={{
    background: '#fff', border: '1px solid #ebebе7',
    borderRadius: 14, overflow: 'hidden',
    width: '100%', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
  }}>
    <div style={{
      padding: '9px 13px', borderBottom: '1px solid #f2f2ee',
      display: 'flex', alignItems: 'center', gap: 7,
      background: '#fafaf8',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
      <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
        Draft Email
      </span>
      {streaming && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#ccc', fontFamily: 'DM Mono, monospace' }}>
          generating…
        </span>
      )}
    </div>

    <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Subject</div>
        <div style={{ fontSize: 14, color: '#111', fontWeight: 700, lineHeight: 1.4, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {subject || <span style={{ color: '#e0e0dc' }}>—</span>}
          {streaming && !subject && <Cursor />}
        </div>
      </div>
      <div style={{ height: 1, background: '#f2f2ee' }} />
      <div>
        <div style={{ fontSize: 10, color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Message</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8, fontFamily: 'DM Mono, monospace', whiteSpace: 'pre-wrap' }}>
          {body || <span style={{ color: '#e0e0dc' }}>Composing…</span>}
          {streaming && <Cursor />}
        </div>
      </div>
    </div>
  </div>
);

// ─── Chat bubble ──────────────────────────────────────────────────────────────
const Bubble = ({ role, children, naked = false }) => {
  const isAI = role === 'ai';

  if (isAI && naked) {
    // No shell — EmailCard is the only visual
    return (
      <div className="bubble-in" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ width: '100%' }}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className="bubble-in"
      style={{ display: 'flex', justifyContent: isAI ? 'flex-start' : 'flex-end', alignItems: 'flex-end', gap: 8 }}
    >
      {isAI && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
      )}
      <div style={{
        maxWidth: isAI ? 'calc(100% - 40px)' : '78%',
        padding: '10px 13px',
        borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isAI ? '#fff' : '#111',
        color: isAI ? '#222' : '#fff',
        fontSize: 13,
        lineHeight: 1.6,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        border: isAI ? '1px solid #eaeae6' : 'none',
        boxShadow: isAI ? '0 1px 4px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.18)',
      }}>
        {children}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmailScreen() {
  const location = useLocation();
  const audioUrl = location.state?.audioUrl;

  const [isTranscribing, setIsTranscribing] = useState(true);
  const [transcribeDone, setTranscribeDone] = useState(false);
  const [isStreaming, setIsStreaming]        = useState(false);
  const [emailMap, setEmailMap]             = useState({});
  const [inputText, setInputText]           = useState('');
  const [authToken, setAuthToken]           = useState(null);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  if (!audioUrl) return <Navigate to="/" replace />;

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: 'http://localhost:3000/api/generate-email' }),
  });

  // ── Parse streaming AI JSON — track per message id ───────────────────────
  useEffect(() => {
    const aiMsgs = messages.filter(m => m.role === 'assistant');
    if (!aiMsgs.length) return;

    const last     = aiMsgs[aiMsgs.length - 1];
    const fullText = last.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '';
    if (!fullText) return;

    const done = fullText.trimEnd().endsWith('}');
    setIsStreaming(!done);

    try {
      const parsed  = parse(fullText);
      const subject = parsed?.emailMessage?.emailSubject || '';
      const body    = parsed?.emailMessage?.emailBody    || '';
      setEmailMap(prev => ({ ...prev, [last.id]: { subject, body, done } }));
    } catch { /* partial — keep waiting */ }
  }, [messages]);

  // ── Transcribe on mount ───────────────────────────────────────────────────
  const sendToAPI = async (token) => {
    if (!audioUrl) return;
    setIsTranscribing(true);
    try {
      const blob     = await (await fetch(audioUrl)).blob();
      const file     = new File([blob], 'recording.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => '')}`);

      const data = await res.json();
      setIsTranscribing(false);
      setTranscribeDone(true);
      sendMessage({ text: data.transcription }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error(err.message || 'Failed to process audio');
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setAuthToken(token);
      sendToAPI(token);
    })();
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTranscribing, isStreaming, emailMap]);

  // ── Auto-grow textarea ────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '20px';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [inputText]);

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    sendMessage({ text }, { headers: { Authorization: `Bearer ${authToken}` } });
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const lastAiMsg     = messages.filter(m => m.role === 'assistant').at(-1);
  const isAiPending   = transcribeDone && isStreaming;
  const canSend       = inputText.trim().length > 0 && !isStreaming;

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
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: '#111',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <polyline points="2,4 12,13 22,4"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.2, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Mail Compose
              </div>
              <div style={{ fontSize: 10, color: '#bbb', fontFamily: 'DM Mono, monospace', letterSpacing: 0.4, marginTop: 1 }}>
                {isTranscribing ? 'Processing audio…' : isStreaming ? 'Generating email…' : 'Ready'}
              </div>
            </div>
          </div>

          <div style={{
            padding: '4px 11px', borderRadius: 99,
            background: isStreaming ? '#111' : '#f0f0ec',
            border: `1px solid ${isStreaming ? '#111' : '#e0e0dc'}`,
            fontSize: 10, fontFamily: 'DM Mono, monospace',
            color: isStreaming ? '#fff' : '#aaa',
            letterSpacing: 0.8, textTransform: 'uppercase',
            transition: 'all 0.25s',
          }}>
            {isTranscribing ? 'transcribing' : isStreaming ? 'streaming' : 'idle'}
          </div>
        </header>

        {/* ── Messages ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 13px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 11 }}>

            {/* Transcription / audio bubble — always first */}
            <Bubble role="ai">
              {isTranscribing
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <WaveBars color="#111" />
                    <span style={{ fontSize: 12, color: '#aaa' }}>Transcribing audio…</span>
                  </div>
                : <AudioBubble audioUrl={audioUrl} />
              }
            </Bubble>

            {/* Render each message as its own bubble in order */}
            {messages.map((msg, idx) => {
              if (msg.role === 'user') {
                const text = msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '';
                return (
                  <Bubble key={msg.id} role="user">{text}</Bubble>
                );
              }

              if (msg.role === 'assistant') {
                const isLast    = msg === lastAiMsg;
                const streaming = isLast && isStreaming;
                const data      = emailMap[msg.id] || { subject: '', body: '' };
                return (
                  <Bubble key={msg.id} role="ai" naked>
                    <EmailCard subject={data.subject} body={data.body} streaming={streaming} />
                  </Bubble>
                );
              }

              return null;
            })}

            {/* Thinking indicator — shows after user sends, before AI response token arrives */}
            {transcribeDone && !isStreaming && (() => {
              const msgs = messages;
              const lastMsg = msgs.at(-1);
              return lastMsg?.role === 'user' ? (
                <Bubble role="ai"><ThinkingDots /></Bubble>
              ) : null;
            })()}

            <div ref={bottomRef} style={{ height: 4 }} />
          </div>
        </div>

        {/* ── Sticky input footer ── */}
        <div style={{
          background: '#fff',
          borderTop: '1px solid #eaeae6',
          padding: '10px 13px 12px',
          flexShrink: 0,
        }}>
          <div style={{
            maxWidth: 640,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}>
            {/* Input row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f7f7f3',
              border: '1.5px solid #e4e4e0',
              borderRadius: 22,
              padding: '7px 7px 7px 15px',
            }}>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a follow-up message…"
                rows={1}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: '#111',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  lineHeight: '20px',
                  height: '20px',
                  maxHeight: 120,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  caretColor: '#111',
                  padding: 0,
                  margin: 0,
                  display: 'block',
                }}
              />
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  width: 34, height: 34,
                  borderRadius: '50%',
                  background: canSend ? '#111' : '#e8e8e4',
                  border: 'none',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={canSend ? '#fff' : '#bbb'} strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            {/* Hint */}
            <div style={{
              textAlign: 'center',
              fontSize: 10,
              color: '#ccc',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: 0.4,
            }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>

      </div>
    </>
  );
}