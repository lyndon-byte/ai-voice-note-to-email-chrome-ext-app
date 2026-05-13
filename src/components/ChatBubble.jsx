

export default function ChatBubble({ role, children, naked = false }){
    
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