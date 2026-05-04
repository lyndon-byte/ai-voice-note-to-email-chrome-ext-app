import { useEffect, useRef, useState, useCallback } from "react";


export default function AudioOrb({
  size = 340,
  showControls = true,
  mode: externalMode,
  analyserNode: externalAnalyser,
  onMicError,
  isPaused = false,
}) {
  const canvasRef = useRef(null);

  // ── mirror all props into refs — draw loop reads these, never stale ────────
  const externalModeRef    = useRef(externalMode);
  const externalAnalyserRef = useRef(externalAnalyser);
  const isPausedRef        = useRef(isPaused);

  useEffect(() => { externalModeRef.current = externalMode; },    [externalMode]);
  useEffect(() => { externalAnalyserRef.current = externalAnalyser; }, [externalAnalyser]);
  useEffect(() => { isPausedRef.current = isPaused; },            [isPaused]);

  // ── animation state ────────────────────────────────────────────────────────
  const s = useRef({
    analyser: null,
    freqData: null,
    simPhase: 0,
    smoothLevel: 0,
    spawnTimer: 0,
    ripples: [],
    orbRadius: 0,
    t: 0,
    last: 0,
    micStream: null,      // keep track so we can clean up
    audioCtx: null,
  });

  const rafRef = useRef(null);

  // ── internal mode (uncontrolled / showControls) ────────────────────────────
  const [internalMode, setInternalMode] = useState("idle");
  const internalModeRef = useRef("idle");
  const setInternal = (m) => { internalModeRef.current = m; setInternalMode(m); };

  const [label, setLabel] = useState("Idle — slow ripples");
  const activeMode = externalMode ?? internalMode;

  // ── effective mode — single source of truth for draw loop ─────────────────
  function effectiveMode() {
    if (isPausedRef.current) return "idle";
    return externalModeRef.current ?? internalModeRef.current;
  }

  // ── mic setup — called whenever effective mode becomes "mic" ──────────────
  const micSetupInProgress = useRef(false);

  async function ensureMic() {
    const st = s.current;
    // already have an analyser (internal or external)
    if (st.analyser) return;
    // external analyser was passed via prop
    if (externalAnalyserRef.current) {
      st.analyser = externalAnalyserRef.current;
      st.freqData = new Uint8Array(st.analyser.frequencyBinCount);
      return;
    }
    // need to request mic ourselves
    if (micSetupInProgress.current) return;
    micSetupInProgress.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new AudioContext();
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      st.analyser  = analyser;
      st.freqData  = new Uint8Array(analyser.frequencyBinCount);
      st.micStream = stream;
      st.audioCtx  = ac;
    } catch {
      onMicError?.();
      // fall back to idle visually
      if (externalModeRef.current === undefined) setInternal("idle");
    } finally {
      micSetupInProgress.current = false;
    }
  }

  // when externalAnalyser prop changes, push it into the animation state
  useEffect(() => {
    if (externalAnalyser) {
      s.current.analyser = externalAnalyser;
      s.current.freqData = new Uint8Array(externalAnalyser.frequencyBinCount);
    }
  }, [externalAnalyser]);

  // when mode becomes "mic" (external or internal), kick off mic setup
  useEffect(() => {
    const m = externalMode ?? internalMode;
    if (m === "mic" && !isPaused) {
      ensureMic();
    }
    // when leaving mic mode, clear internal analyser so next mic request is fresh
    if (m !== "mic") {
      if (s.current.micStream) {
        s.current.micStream.getTracks().forEach((t) => t.stop());
        s.current.micStream = null;
      }
      if (s.current.audioCtx) {
        s.current.audioCtx.close().catch(() => {});
        s.current.audioCtx = null;
      }
      if (!externalAnalyser) {
        s.current.analyser = null;
        s.current.freqData = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMode, internalMode, isPaused]);

  // ── audio level ────────────────────────────────────────────────────────────
  function getLevel() {
    const st = s.current;
    const mode = effectiveMode();
    if (mode === "mic" && st.analyser) {
      st.analyser.getByteFrequencyData(st.freqData);
      return st.freqData.reduce((a, b) => a + b, 0) / (st.freqData.length * 255);
    }
    if (mode === "sim") {
      st.simPhase += 0.04;
      return Math.min(
        1,
        0.3 +
          0.28 * Math.sin(st.simPhase) +
          0.18 * Math.abs(Math.sin(st.simPhase * 2.7)) +
          (Math.random() < 0.06 ? 0.4 * Math.random() : 0)
      );
    }
    return 0;
  }

  // ── ripple spawner ─────────────────────────────────────────────────────────
  function scheduleSpawn(dt, level, baseR) {
    const st = s.current;
    const listening = ["mic", "sim"].includes(effectiveMode());
    const interval = listening ? Math.max(80, 600 * (1 - level * 0.95)) : 1400;
    st.spawnTimer += dt;
    if (st.spawnTimer >= interval) {
      st.spawnTimer = 0;
      st.ripples.push({
        r: baseR,
        speed: listening ? 0.8 + level * 2.8 : 0.7,
        alpha: listening ? 0.18 + level * 0.55 : 0.72,
        lineWidth: listening ? 1.4 : 2.2,
        dark: listening,
      });
    }
  }

  // ── draw loop ──────────────────────────────────────────────────────────────
  function draw(now, ctx, PX) {
    const st = s.current;
    const CX = PX / 2, CY = PX / 2;
    const ORB_IDLE   = PX * 0.22;
    const ORB_LISTEN = PX * 0.124;
    const MAX_R      = PX * 0.5;

    const dt = Math.min(now - st.last, 50);
    st.last = now;
    st.t += dt * 0.001;

    const mode = effectiveMode();
    const listening = mode === "mic" || mode === "sim";

    const raw = getLevel();
    st.smoothLevel += (raw - st.smoothLevel) * (raw > st.smoothLevel ? 0.3 : 0.06);

    // smoothly blend 0=idle(gray/black) → 1=listening(red shades)
    if (st.colorBlend === undefined) st.colorBlend = 0;
    st.colorBlend += ((listening ? 1 : 0) - st.colorBlend) * 0.04;
    const c = st.colorBlend;

    function lerpRGB(r1, g1, b1, r2, g2, b2, t) {
      return [
        Math.round(r1 + (r2 - r1) * t),
        Math.round(g1 + (g2 - g1) * t),
        Math.round(b1 + (b2 - b1) * t),
      ];
    }
    function lerp(a, b, t) { return a + (b - a) * t; }

    const targetR = listening ? ORB_LISTEN : ORB_IDLE;
    st.orbRadius += (targetR - st.orbRadius) * 0.06;

    const displayR = listening
      ? st.orbRadius + st.smoothLevel * ORB_LISTEN * 0.22 * Math.abs(Math.sin(st.t * 12))
      : st.orbRadius;

    scheduleSpawn(dt, st.smoothLevel, st.orbRadius);

    ctx.clearRect(0, 0, PX, PX);

    // ripple rings
    for (let i = st.ripples.length - 1; i >= 0; i--) {
      const rp = st.ripples[i];
      rp.r += rp.speed * (1 + st.smoothLevel * 1.2);
      const origin = rp.dark ? ORB_LISTEN : ORB_IDLE;
      const life = Math.max(0, 1 - (rp.r - origin) / (MAX_R - origin));
      if (life <= 0) { st.ripples.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(CX, CY, rp.r, 0, Math.PI * 2);
      if (rp.dark) {
        // listening ripples: vivid red, flares brighter with audio level
        const rVal = Math.round(220 + st.smoothLevel * 35);
        const [r, g, b] = lerpRGB(20, 20, 24, rVal, 10, 10, c);
        ctx.strokeStyle = `rgba(${r},${g},${b},${rp.alpha * life})`;
      } else {
        // idle ripples: gray → vivid red tint as blend increases
        const [r, g, b] = lerpRGB(160, 160, 160, 220, 30, 30, c);
        ctx.strokeStyle = `rgba(${r},${g},${b},${rp.alpha * life})`;
      }
      ctx.lineWidth = rp.lineWidth;
      ctx.stroke();
    }

    // orb: black → bright true red, pulses with audio level
    const orbR = Math.round(lerp(0, 200 + st.smoothLevel * 55, c));
    const orbG = Math.round(lerp(0, 10, c));
    const orbB = Math.round(lerp(0, 10, c));
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, displayR, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${orbR},${orbG},${orbB})`;
    ctx.fill();
    ctx.restore();

    rafRef.current = requestAnimationFrame((t) => draw(t, ctx, PX));
  }

  // ── mount / cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const PX = size * 2;
    canvas.width = PX;
    canvas.height = PX;
    s.current.orbRadius = PX * 0.22;
    s.current.last = performance.now();
    rafRef.current = requestAnimationFrame((t) => draw(t, ctx, PX));
    return () => {
      cancelAnimationFrame(rafRef.current);
      // clean up mic on unmount
      s.current.micStream?.getTracks().forEach((t) => t.stop());
      s.current.audioCtx?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // ── button helpers ─────────────────────────────────────────────────────────
  const switchMode = (next, lbl) => {
    s.current.ripples = [];
    s.current.spawnTimer = 0;
    setInternal(next);
    setLabel(lbl);
  };

  const btnStyle = (id) => ({
    fontSize: 12,
    padding: "7px 16px",
    borderRadius: 20,
    cursor: "pointer",
    border: activeMode === id ? "0.5px solid #3a5080" : "0.5px solid #444",
    background: activeMode === id ? "#111827" : "transparent",
    color: activeMode === id ? "#7ab4ff" : "#888",
    transition: "all 0.2s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: "block", background: "transparent" }}
      />
      {showControls && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button style={btnStyle("idle")} onClick={() => switchMode("idle", "Idle — slow ripples")}>
              Idle
            </button>
            <button style={btnStyle("mic")} onClick={() => switchMode("mic", "Listening — speak or clap!")}>
              Microphone
            </button>
            <button style={btnStyle("sim")} onClick={() => switchMode("sim", "Listening — pulsing orb, dark waves")}>
              Simulate
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{label}</p>
        </>
      )}
    </div>
  );
}