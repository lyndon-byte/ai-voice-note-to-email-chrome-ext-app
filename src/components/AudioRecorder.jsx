import { useRef, useState, useEffect } from 'react';
import AudioOrb from './AudioOrb';
import axios from 'axios';
import { getToken } from '../AuthGuard';

const WaveBars = ({ color = '#111' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
    {[...Array(7)].map((_, i) => (
      <div
        key={i}
        className="wave-bar"
        style={{ width: 3, height: 3, background: color, borderRadius: 99, transformOrigin: 'center' }}
      />
    ))}
  </div>
);

export default function AudioRecorder({ onFinishTranscription }) {
  const [isRecording, setIsRecording]       = useState(false);
  const [isPaused, setIsPaused]             = useState(false);
  const [mode, setMode]                     = useState('idle');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const streamRef        = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const analyserRef      = useRef(null);
  const audioRef         = useRef(null);
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
      setIsPaused(false);
      isDiscardedRef.current = false;
      chunksRef.current = [];

      const hasPermission = await requestPermissionFallback();
      if (!hasPermission) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder  = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const ac       = new AudioContext();
      const src      = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
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
      audioRef.current = stream;
      setIsRecording(true);
    } catch (err) {
      console.error('Start recording failed:', err);
    }
  };

  const stopStream = () => {
    setIsPaused(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stopTracks();
    audioRef.current    = null;
    analyserRef.current = null;
    setIsRecording(false);
    setMode('idle');
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') { recorder.pause(); setIsPaused(true); }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') { recorder.resume(); setIsPaused(false); }
  };

  const handleDiscard = () => { isDiscardedRef.current = true; stopStream(); };

  return (
    <>
      <style>{`
        @keyframes wb-pulse {
          0%,100% { transform: scaleY(.3); opacity: .4; }
          50%      { transform: scaleY(1);  opacity: 1; }
        }
        .wave-bar { animation: wb-pulse 1s ease-in-out infinite; }
        .wave-bar:nth-child(1){ animation-delay: 0s }
        .wave-bar:nth-child(2){ animation-delay: .08s }
        .wave-bar:nth-child(3){ animation-delay: .16s }
        .wave-bar:nth-child(4){ animation-delay: .24s }
        .wave-bar:nth-child(5){ animation-delay: .16s }
        .wave-bar:nth-child(6){ animation-delay: .08s }
        .wave-bar:nth-child(7){ animation-delay: 0s }

        @keyframes ts-in {
          from { opacity:0; transform: scale(.92); }
          to   { opacity:1; transform: scale(1); }
        }
        .ts-panel { animation: ts-in .22s ease both; }

        .ar-btn {
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform .12s, background .12s, opacity .2s, border-color .12s;
        }
        .ar-btn:hover  { transform: scale(1.08); }
        .ar-btn:active { transform: scale(.91); }
        .ar-btn.ar-gone {
          opacity: 0;
          pointer-events: none;
          transform: scale(.78);
        }
      `}</style>

      {isTranscribing ? (
        /* ── Full transcribing replacement — no orb, no controls ── */
        <div className="ts-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '8px 0 2px',
          width: '100%',
        }}>
          {/* Wave bars centered in a dark pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#111',
            borderRadius: 99,
            padding: '14px 28px',
          }}>
            <WaveBars color="#fff" />
          </div>
          <span style={{
            fontSize: 11,
            fontFamily: 'DM Mono, monospace',
            color: '#bbb',
            letterSpacing: '.6px',
            textTransform: 'uppercase',
          }}>
            Transcribing…
          </span>
        </div>
      ) : (
        /* ── Normal: orb + controls ── */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '8px 0 2px',
          width: '100%',
        }}>

          {/* Orb — display only, never clickable */}
          <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <AudioOrb
              size={72}
              mode={mode}
              analyserNode={analyserRef.current}
              showControls={false}
              isPaused={isPaused}
            />
          </div>

          {/* Controls: discard | start/pause/resume | proceed */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}>

            {/* Discard */}
            <button
              className={`ar-btn${isRecording ? '' : ' ar-gone'}`}
              onClick={handleDiscard}
              title="Discard"
              style={{
                width: 40, height: 40,
                background: '#f5f5f2',
                border: '1.5px solid #e4e4e0',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                <line x1="3" y1="3" x2="15" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
                <line x1="15" y1="3" x2="3" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Start / Pause / Resume */}
            {!isRecording ? (
              <button
                className="ar-btn"
                onClick={startStream}
                title="Start recording"
                style={{ width: 52, height: 52, background: '#fff', border: '2px solid #ef4444' }}
              >
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ef4444', display: 'block' }} />
              </button>
            ) : (
              <button
                className="ar-btn"
                onClick={isPaused ? resumeRecording : pauseRecording}
                title={isPaused ? 'Resume' : 'Pause'}
                style={{ width: 52, height: 52, background: '#fff', border: '2px solid #ef4444' }}
              >
                {isPaused ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M5 3L17 10L5 17V3Z" fill="#ef4444"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <rect x="4"  y="3" width="4" height="14" rx="2" fill="#ef4444"/>
                    <rect x="12" y="3" width="4" height="14" rx="2" fill="#ef4444"/>
                  </svg>
                )}
              </button>
            )}

            {/* Proceed / Send */}
            <button
              className={`ar-btn${isRecording ? '' : ' ar-gone'}`}
              onClick={stopStream}
              title="Done"
              style={{ width: 40, height: 40, background: '#111', border: 'none' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>

          </div>
        </div>
      )}
    </>
  );
}