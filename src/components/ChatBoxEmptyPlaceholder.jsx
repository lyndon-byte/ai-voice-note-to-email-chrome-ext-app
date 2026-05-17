const WaveformIcon = () => (
  <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}>
    <style>{`
      @keyframes wv { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
      .wb { transform-origin: center; animation: wv 1.1s ease-in-out infinite; }
      .wb:nth-child(1){ animation-delay:0s }
      .wb:nth-child(2){ animation-delay:.1s }
      .wb:nth-child(3){ animation-delay:.2s }
      .wb:nth-child(4){ animation-delay:.1s }
      .wb:nth-child(5){ animation-delay:0s }
    `}</style>
    {[4, 8, 12, 8, 4].map((h, i) => (
      <rect
        key={i}
        className="wb"
        x={i * 8 + 2}
        y={(24 - h * 2) / 2}
        width="4"
        height={h * 2}
        rx="2"
        fill="currentColor"
      />
    ))}
  </svg>
);

export const ChatBoxEmptyPlaceholder = () => {
  
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      gap: 0,
      userSelect: 'none',
    }}>

      {/* Icon badge */}
      <div style={{
        width: 68,
        height: 68,
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #2a2a2a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 22,
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,.18), 0 1px 0 rgba(255,255,255,.08) inset',
        position: 'relative',
      }}>
        <WaveformIcon />
        {/* Subtle glow ring */}
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 21,
          border: '1px solid rgba(255,255,255,.12)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Headline */}
      <div style={{
        fontSize: 17,
        fontWeight: 700,
        color: '#111',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        letterSpacing: '-.3px',
        marginBottom: 6,
        textAlign: 'center',
      }}>
        Start with a voice note
      </div>

      {/* Sub-headline */}
      <div style={{
        fontSize: 13,
        color: '#888',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        lineHeight: 1.55,
        textAlign: 'center',
        maxWidth: 240,
        marginBottom: 28,
      }}>
        Describe the email you need — AI will draft it instantly
      </div>
   </div>
  );
};