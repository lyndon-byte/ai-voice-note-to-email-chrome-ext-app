import { useEffect, useRef, useState } from "react";

const NUM_BARS = 20;

export default function AudioWaveBar({
  width = 340,
  height = 60,
  mode: externalMode,
  analyserNode: externalAnalyser,
  onMicError,
  isPaused = false,
}) {
  const canvasRef = useRef(null);

  const externalModeRef     = useRef(externalMode);
  const externalAnalyserRef = useRef(externalAnalyser);
  const isPausedRef         = useRef(isPaused);

  useEffect(() => { externalModeRef.current = externalMode; },     [externalMode]);
  useEffect(() => { externalAnalyserRef.current = externalAnalyser; }, [externalAnalyser]);
  useEffect(() => { isPausedRef.current = isPaused; },             [isPaused]);

  const s = useRef({
    analyser:   null,
    freqData:   null,
    simPhase:   0,
    smoothBars: new Array(NUM_BARS).fill(0),
    t:          0,
    last:       0,
    micStream:  null,
    audioCtx:   null,
  });

  const rafRef = useRef(null);

  const [internalMode, setInternalMode] = useState("idle");
  const internalModeRef = useRef("idle");
  const setInternal = (m) => { internalModeRef.current = m; setInternalMode(m); };

  function effectiveMode() {
    if (isPausedRef.current) return "idle";
    return externalModeRef.current ?? internalModeRef.current;
  }

  const micSetupInProgress = useRef(false);

  async function ensureMic() {
    const st = s.current;
    if (st.analyser) return;
    if (externalAnalyserRef.current) {
      st.analyser = externalAnalyserRef.current;
      st.freqData = new Uint8Array(st.analyser.frequencyBinCount);
      return;
    }
    if (micSetupInProgress.current) return;
    micSetupInProgress.current = true;
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac       = new AudioContext();
      const src      = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      // Large FFT = 1024 bins, each ~21 Hz wide at 44.1 kHz
      // 20 bars across 80–8000 Hz means each bar covers ~400 Hz — always active
      analyser.fftSize               = 2048;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      st.analyser  = analyser;
      st.freqData  = new Uint8Array(analyser.frequencyBinCount);
      st.micStream = stream;
      st.audioCtx  = ac;
    } catch {
      onMicError?.();
      if (externalModeRef.current === undefined) setInternal("idle");
    } finally {
      micSetupInProgress.current = false;
    }
  }

  useEffect(() => {
    if (externalAnalyser) {
      s.current.analyser = externalAnalyser;
      s.current.freqData = new Uint8Array(externalAnalyser.frequencyBinCount);
    }
  }, [externalAnalyser]);

  useEffect(() => {
    const m = externalMode ?? internalMode;
    if (m === "mic" && !isPaused) ensureMic();
    if (m !== "mic") {
      s.current.micStream?.getTracks().forEach((t) => t.stop());
      s.current.micStream = null;
      s.current.audioCtx?.close().catch(() => {});
      s.current.audioCtx = null;
      if (!externalAnalyser) {
        s.current.analyser = null;
        s.current.freqData = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMode, internalMode, isPaused]);

  function getBarLevels() {
    const st   = s.current;
    const mode = effectiveMode();
    const levels = new Array(NUM_BARS).fill(0);

    if (mode === "mic" && st.analyser && st.freqData) {
      st.analyser.getByteFrequencyData(st.freqData);

      const totalBins = st.freqData.length;
      const loBin     = 4;
      const hiBin     = Math.floor(totalBins * 0.36);
      let sum = 0;
      for (let j = loBin; j < hiBin; j++) sum += st.freqData[j];
      const overallLevel = Math.min(1, (sum / ((hiBin - loBin) * 255)) * 2.5);

      // Store the raw overall level so draw() can build a wave from it
      st.overallLevel = overallLevel;
      // return flat — draw() applies wave shaping
      for (let i = 0; i < NUM_BARS; i++) levels[i] = overallLevel;

    } else if (mode === "sim") {
      st.simPhase += 0.04;
      const base = Math.min(
        1,
        0.3 +
          0.35 * Math.abs(Math.sin(st.simPhase)) +
          0.2  * Math.abs(Math.sin(st.simPhase * 2.7)) +
          (Math.random() < 0.05 ? 0.3 * Math.random() : 0)
      );
      st.overallLevel = base;
      for (let i = 0; i < NUM_BARS; i++) levels[i] = base;
    }

    return levels;
  }

  function draw(now, ctx, PX, PY) {
    const st = s.current;
    const dt = Math.min(now - st.last, 50);
    st.last  = now;
    st.t    += dt * 0.001;

    const mode      = effectiveMode();
    const listening = mode === "mic" || mode === "sim";
    getBarLevels(); // updates st.overallLevel

    // Wave engine: each bar has its own phase offset from center.
    // The audio level drives amplitude; a travelling sine creates the wave shape.
    if (!st.elapsed) st.elapsed = 0;
    st.elapsed += dt; // raw elapsed ms — bars read delayed slices of this

    const center = (NUM_BARS - 1) / 2;
    const level  = st.overallLevel || 0;

    // Each bar has its own random sine period and phase offset so heights
    // are independent and organic — no staircase pattern.
    // Seed per-bar randoms once into animation state.
    if (!st.barSeeds) {
      st.barSeeds = Array.from({ length: NUM_BARS }, (_, i) => ({
        period:  800 + Math.random() * 700,   // 800–1500 ms cycle per bar
        phase:   Math.random() * Math.PI * 2, // random start phase
        noiseT:  Math.random() * 1000,        // noise offset
      }));
    }

    for (let i = 0; i < NUM_BARS; i++) {
      const dist = Math.abs(i - center) / center; // 0=center, 1=edge

      // Delay: center bars react immediately, edge bars lag
      const maxDelay = 220;
      const delayedT = st.elapsed - dist * maxDelay;

      const seed   = st.barSeeds[i];
      const angle  = (delayedT / seed.period) * Math.PI * 2 + seed.phase;

      // Each bar oscillates independently — no shared envelope shape
      const cycle  = 0.5 - 0.5 * Math.cos(angle); // 0→1, always positive

      // Small per-bar noise to break any remaining uniformity
      seed.noiseT += dt * 0.001;
      const noise  = 0.15 * (0.5 - 0.5 * Math.cos(seed.noiseT * 3.7 + i));

      // Edge bars have a lower max amplitude so reaction visibly starts from center
      const edgeDamp = 1 - dist * 0.55;
      const minAmp   = 0.08;
      const target   = listening
        ? minAmp + level * edgeDamp * Math.min(1, cycle + noise) * (1 - minAmp)
        : minAmp;

      const speed = target > st.smoothBars[i] ? 0.4 : 0.1;
      st.smoothBars[i] += (target - st.smoothBars[i]) * speed;
    }

    ctx.clearRect(0, 0, PX, PY);

    // ── layout: gap = 55% of bar width for clear separation ──────────────────
    const gapRatio  = 0.55;
    const outerPad  = PX * 0.025;
    const available = PX - 2 * outerPad;
    // available = NUM_BARS * barW + (NUM_BARS - 1) * barW * gapRatio
    const barW  = available / (NUM_BARS + gapRatio * (NUM_BARS - 1));
    const gap   = barW * gapRatio;

    const maxBarH = PY * 0.88;
    const minBarH = PY * 0.10;
    const cy      = PY / 2;
    const cornerR = barW * 0.5; // fully rounded pill caps

    for (let i = 0; i < NUM_BARS; i++) {
      const x     = outerPad + i * (barW + gap);
      const level = st.smoothBars[i];

      const barH = listening
        ? minBarH + level * (maxBarH - minBarH)
        : minBarH;

      const top = cy - barH / 2;

      // Black bars; opacity driven by audio level when listening
      const opacity = listening ? 0.28 + level * 0.72 : 0.35;
      ctx.fillStyle = `rgba(0,0,0,${opacity})`;

      // Pill-shaped rounded rect
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, top, barW, barH, cornerR);
      } else {
        const r = Math.min(cornerR, barH / 2, barW / 2);
        ctx.moveTo(x + r, top);
        ctx.lineTo(x + barW - r, top);
        ctx.quadraticCurveTo(x + barW, top,        x + barW, top + r);
        ctx.lineTo(x + barW, top + barH - r);
        ctx.quadraticCurveTo(x + barW, top + barH, x + barW - r, top + barH);
        ctx.lineTo(x + r,    top + barH);
        ctx.quadraticCurveTo(x, top + barH,        x, top + barH - r);
        ctx.lineTo(x, top + r);
        ctx.quadraticCurveTo(x, top,               x + r, top);
        ctx.closePath();
      }
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame((t) => draw(t, ctx, PX, PY));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const PX  = width  * 2;
    const PY  = height * 2;
    canvas.width  = PX;
    canvas.height = PY;
    s.current.last = performance.now();
    rafRef.current = requestAnimationFrame((t) => draw(t, ctx, PX, PY));
    return () => {
      cancelAnimationFrame(rafRef.current);
      s.current.micStream?.getTracks().forEach((t) => t.stop());
      s.current.audioCtx?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, display: "block", background: "transparent" }}
      />
    </div>
  );
}