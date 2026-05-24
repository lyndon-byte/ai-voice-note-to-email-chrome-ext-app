import { useRef, useState, useEffect } from 'react';
import AudioWaveBar from './AudioWaveBar';
import axios from 'axios';
import { getToken } from '../AuthGuard';

export default function AudioRecorder({ onFinishTranscription, isDisabled}) {
  const [isRecording, setIsRecording]       = useState(false);
  const [mode, setMode]                     = useState('idle');
  const [isTranscribing, setIsTranscribing] = useState(false);

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
        const { data } = await axios.post(
          'http://localhost:3000/api/transcribe',
          formData,
          { headers: { authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        setIsTranscribing(false);
        onFinishTranscription(data.transcription);
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