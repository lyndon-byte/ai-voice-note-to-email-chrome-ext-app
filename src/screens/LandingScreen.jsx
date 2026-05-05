import { useRef, useState, useEffect } from 'react';
import AudioOrb from '../components/AudioOrb';
import { redirect, useNavigate } from 'react-router-dom';

export default function LandingScreen() {

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState("idle");

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const isDiscardedRef = useRef(false);

  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const requestPermissionFallback = async () => {

    try {

      const perm = await navigator.permissions.query({ name: 'microphone' });

      if (perm.state !== 'granted') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.create({
          url: `request-mic.html?returnTo=${tab.id}`,
        });
        return false;
      }

      return true;

    } catch (err) {

      console.warn('Permission API not supported, proceeding normally');
      return true;

    }
  };

  const startStream = async () => {

    try {

      setIsPaused(false); 
      isDiscardedRef.current = false; 

      const hasPermission = await requestPermissionFallback();
      if (!hasPermission) return;

      // Reset previous session
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const ac = new AudioContext();
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      setMode("mic");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data); // ✅ store Blob directly
        }
      };

      recorder.onstop = () => {

        if (isDiscardedRef.current) {
          return; 
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);


        navigate('/email', { state: { audioUrl: url } });


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

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    stopTracks();

    audioRef.current = null;

    setIsRecording(false);
    setMode("idle");
    analyserRef.current = null;

  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      setIsPaused(false);
    }
  };

  const handleDiscard = () => {

    isDiscardedRef.current = true

    stopStream()

  }


  return (
   
     <div className="flex flex-col items-center justify-between min-h-screen px-6 py-12 bg-white">

      {/* Orb + Label */}

      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center w-52 h-52 mt-16">
          
          <div className="w-44 h-44 rounded-full flex items-center justify-center">

              <AudioOrb
                size={240}
                mode={mode}
                analyserNode={analyserRef.current}
                showControls={false}
                isPaused={isPaused}
              />

          </div>
        </div>
        <div
            className={`flex items-center gap-2 mt-5 transition-opacity duration-400 ${
              isRecording && !isPaused ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-sm tracking-[0.14em] text-gray-500 font-medium">
              Listening...
            </span>
        </div>
      </div>

      {/* Controls */}

      <div className="flex items-center justify-center gap-7">

         <button
          onClick={handleDiscard}
          className={`w-13 h-13 rounded-full bg-white border border-gray-300 flex items-center justify-center
            transition-all duration-200 hover:scale-105 hover:bg-gray-50 active:scale-95 cursor-pointer
            ${isRecording ? "opacity-100 pointer-events-auto animate-[fadeIn_0.25s_ease]" : "opacity-0 pointer-events-none"}`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="3" y1="3" x2="15" y2="15" stroke="#111" strokeWidth="2" strokeLinecap="round" />
            <line x1="15" y1="3" x2="3" y2="15" stroke="#111" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {!isRecording ? (

          <button
            onClick={startStream}
            className="w-14 h-14 rounded-full bg-white border-2 border-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="w-5 h-5 rounded-full bg-red-500" />
          </button>

        ) : (
          <>
           
            {/* Pause / Resume */}
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-14 h-14 rounded-full bg-white border-2 border-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isPaused ? (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <path d="M5 3L17 10L5 17V3Z" fill="#EF4444" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="3" width="4" height="14" rx="2" fill="#EF4444" />
                  <rect x="12" y="3" width="4" height="14" rx="2" fill="#EF4444" />
                </svg>
              )}
            </button>

          </>
        )}

       <button
          onClick={stopStream}
          className={`w-13 h-13 rounded-full bg-white border border-gray-300 flex items-center justify-center
            transition-all duration-200 hover:scale-105 hover:bg-gray-50 active:scale-95 cursor-pointer
            ${isRecording ? "opacity-100 pointer-events-auto animate-[fadeIn_0.25s_ease]" : "opacity-0 pointer-events-none"}`}
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M4 11.5L9 16.5L18 6" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

      </div>

    </div>
  );
}