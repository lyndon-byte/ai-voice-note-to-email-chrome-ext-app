import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioWaveBar from './AudioWaveBar';
import axios from 'axios';
import { getToken } from '../AuthGuard';

const UPGRADE_ERROR_CODES = new Set(['FREE_TIER_LIMIT_REACHED', 'SUBSCRIPTION_INACTIVE']);

export default function AudioRecorder({ onFinishTranscription, isDisabled}) {

  const navigate = useNavigate();
  const [isRecording, setIsRecording]       = useState(false);
  const [mode, setMode]                     = useState('idle');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);

  const streamRef        = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const analyserRef      = useRef(null);
  const isDiscardedRef   = useRef(false);
  
  useEffect(() => () => stopTracks(), []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const requestPermissionFallback = async () => {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' });
      if (perm.state !== 'granted') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.create({ url: `request-mic.html?returnTo=${tab.id}` });
        return false;
      }
      return true;
    } catch { return true; }
  };

  const startStream = async () => {
    try {
      isDiscardedRef.current = false;
      chunksRef.current = [];

      const hasPermission = await requestPermissionFallback();
      if (!hasPermission) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const ac       = new AudioContext();
      const src      = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      analyserRef.current = analyser;

      setMode('mic');

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (isDiscardedRef.current) { setIsTranscribing(false); return; }
        setIsTranscribing(true);
        const blob     = new Blob(chunksRef.current, { type: 'audio/webm' });
        const token    = await getToken();
        const formData = new FormData();
        formData.append('file', blob, `audio-${Date.now()}-${crypto.randomUUID()}.webm`);
        try {
          const { data } = await axios.post(
            'http://localhost:3000/api/transcribe',
            formData,
            { headers: { authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
          );
          setIsTranscribing(false);
          onFinishTranscription(data.transcription);
        } catch (err) {
          setIsTranscribing(false);
          setIsRecording(false);
          setMode('idle');
          const apiError = err.response?.data;
          setSubscriptionError({
            error_code: apiError?.error_code ?? 'UNKNOWN_ERROR',
            message: apiError?.message ?? 'Something went wrong. Please try again.',
          });
        }
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Start recording failed:', err);
    }
  };

  const stopStream = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stopTracks();
    analyserRef.current = null;
    setIsRecording(false);
    setMode('idle');
  };

  const handleDiscard = () => {
    isDiscardedRef.current = true;
    stopStream();
  };

  /* ─── shared icon colors ─── */
  const DARK = '#2d2f36';

  return (
    <>
      <style>{`
        @keyframes ar-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ar-scale-in {
          from { opacity: 0; transform: scale(.82); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes ts-pulse {
          0%,100% { opacity: .4; } 50% { opacity: 1; }
        }

        .ar-root {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 24px 16px 20px;
          box-sizing: border-box;
          min-height: 140px;
        }

        /* corner buttons */
        .ar-corner {
          position: absolute;
          top: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: #ebebeb;
          transition: background .15s, transform .12s;
          animation: ar-scale-in .2s ease both;
        }
        .ar-corner:hover  { background: #ddd; transform: scale(1.08); }
        .ar-corner:active { transform: scale(.92); }
        .ar-corner.left  { left: 12px; }
        .ar-corner.right { right: 12px; background: ${DARK}; }
        .ar-corner.right:hover { background: #444; }

        /* mic start button */
        .ar-mic-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          background: ${DARK};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform .12s, background .15s;
          animation: ar-scale-in .22s ease both;
          flex-shrink: 0;
        }
        .ar-mic-btn:hover  { background: #444; transform: scale(1.07); }
        .ar-mic-btn:active { transform: scale(.91); }
        .ar-mic-btn:disabled { cursor: default; background: #d1d5dc; }

        /* wave + label area */
        .ar-wave-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          animation: ar-fade-in .25s ease both;
        }

        .ar-label {
          font-size: 12px;
          color: #888;
          letter-spacing: .4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* transcribing dots */
        .ts-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #888;
          animation: ts-pulse 1.2s ease-in-out infinite;
        }
        .ts-dot:nth-child(2) { animation-delay: .2s; }
        .ts-dot:nth-child(3) { animation-delay: .4s; }
      `}</style>

      {subscriptionError && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.55)',
            animation: 'ar-fade-in .2s ease both',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              background: '#18181b',
              borderRadius: 14,
              boxShadow: '0 24px 48px rgba(0,0,0,.45)',
              textAlign: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Purple accent bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />

            <div style={{ padding: '20px 20px 20px' }}>
              {/* Icon */}
              <div style={{
                width: 42, height: 42,
                borderRadius: '50%',
                background: 'rgba(168,85,247,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill="#a855f7" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Message */}
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                {UPGRADE_ERROR_CODES.has(subscriptionError.error_code)
                  ? 'Unlock unlimited emails'
                  : 'Something went wrong'}
              </p>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
                {subscriptionError.message}
              </p>

              {/* Upgrade CTA — only for subscription-related errors */}
              {UPGRADE_ERROR_CODES.has(subscriptionError.error_code) && (
                <button
                  onClick={() => { setSubscriptionError(null); navigate('/pay'); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    cursor: 'pointer',
                    marginBottom: 10,
                    boxShadow: '0 4px 18px rgba(168,85,247,0.45)',
                  }}
                >
                  Upgrade to Pro
                </button>
              )}

              {/* Dismiss */}
              <button
                onClick={() => setSubscriptionError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px 0',
                  width: '100%',
                }}
              >
                {UPGRADE_ERROR_CODES.has(subscriptionError.error_code) ? 'Maybe later' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ar-root">

        {isTranscribing ? (
          /* ── Transcribing state ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div className="ts-dot" />
              <div className="ts-dot" />
              <div className="ts-dot" />
            </div>
            <span className="ar-label">Transcribing…</span>
          </div>

        ) : isRecording ? (
          /* ── Recording state: X | wave+label | ✓ ── */
          <>
            {/* Discard — top left */}
            <button className="ar-corner left" onClick={handleDiscard} title="Discard">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <line x1="2" y1="2" x2="12" y2="12" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="2" x2="2"  y2="12" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Wave bar + Listening label — center */}
            <div className="ar-wave-area">
              <AudioWaveBar
                width={200}
                height={52}
                mode={mode}
                analyserNode={analyserRef.current}
                isPaused={false}
              />
              <span className="ar-label">Listening</span>
            </div>

            {/* Done — top right */}
            <button className="ar-corner right" onClick={stopStream} title="Done">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>

        ) : (
          /* ── Idle state: just the mic button ── */
          <button 
            className="ar-mic-btn" 
            onClick={startStream} 
            title="Start recording"
            disabled={isDisabled}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="#fff"/>
              <path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <line x1="12" y1="18" x2="12" y2="22" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="9"  y1="22" x2="15" y2="22" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}

      </div>
    </>
  );
}