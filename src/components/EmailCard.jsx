
import { useState, useEffect, useRef } from "react";

// ─── Cursor ───────────────────────────────────────────────────────────────────
const Cursor = () => (
  <span
    className="
      inline-block
      w-2
      h-2
      ml-1
      rounded-full
      bg-gray-900
      animate-[blink_1s_infinite]
    "
  />
);

export default function EmailCard({ subject, body, streaming }){

  const [editSubject, setEditSubject] = useState(subject);
  const [editBody,    setEditBody]    = useState(body);
  const [isEditing,   setIsEditing]   = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const textareaRef = useRef(null);
 
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';            // reset
    el.style.height = el.scrollHeight + 'px'; // expand to content
  };

  useEffect(() => {
    if (isEditing) {
      autoResize();
    }
  }, [editBody, isEditing]);
  // Sync streamed values only when not editing
  useEffect(() => { if (!isEditing) setEditSubject(subject); }, [subject, isEditing]);
  useEffect(() => { if (!isEditing) setEditBody(body);       }, [body,    isEditing]);
 
  // ── Register drop listeners on the active tab via scripting ─────────────
  const registerDropTarget = async (subj, bdy) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
 
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (subj, bdy) => {
          // Remove any previous listeners
          if (window.__aiDropCleanup__) window.__aiDropCleanup__();
 
          const normalize = (t) => t.replace(/\n/g, '<div><br></div>');
 
          const onDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
 
            // Highlight hovered droppable
            const el = e.target.closest(
              'input[name="subjectbox"], input, textarea, [contenteditable="true"]'
            );
            document.querySelectorAll('.__ai_drop_highlight__')
              .forEach(n => n.classList.remove('__ai_drop_highlight__'));
            if (el) {
              el.classList.add('__ai_drop_highlight__');
              if (!document.getElementById('__ai_drop_style__')) {
                const s = document.createElement('style');
                s.id = '__ai_drop_style__';
                s.textContent = '.__ai_drop_highlight__{outline:2.5px solid #111 !important;outline-offset:2px !important;border-radius:4px;}';
                document.head.appendChild(s);
              }
            }
          };
 
          const onDrop = (e) => {

            e.preventDefault();
            e.stopPropagation();

            // Clear highlights
            document.querySelectorAll('.__ai_drop_highlight__')
              .forEach(n => n.classList.remove('__ai_drop_highlight__'));

            const raw = e.dataTransfer.getData('application/x-ai-email');
            if (!raw) return;

            let data;
            try { data = JSON.parse(raw); } catch { return; }

            const { subject: s, body: b } = data;

            const normalize = (text) =>
                text
                  .split('\n')
                  .map(line => `<div>${line || '<br>'}</div>`)
                  .join('');

            // ── ALWAYS resolve fields globally ───────────────────────────
            const subjectEl =
              document.querySelector('input[name="subjectbox"]') ||
              document.querySelector('input[placeholder*="Subject"]');

            let bodyEl = null;

            for (const sel of [
              'div[role="textbox"][contenteditable="true"]',
              'div[aria-label*="Message body"]',
              '.Am',
              'textarea'
            ]) {
              const el = document.querySelector(sel);
              if (el) {
                bodyEl = el;
                break;
              }
            }

             if (!subjectEl && bodyEl && s) {
              
              const combined = `Subject: ${s}\n\n${b || ''}`;

              if (bodyEl.isContentEditable) {
                bodyEl.innerHTML = normalize(combined);
                bodyEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
              } else {
                bodyEl.value = combined;
                bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
              }

              return; // 🚨 important: stop normal flow
            }


            // ── Fill BOTH if available ───────────────────────────────────
            if (subjectEl && s) {
              subjectEl.value = s;
              subjectEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (bodyEl && b) {
              if (bodyEl.isContentEditable) {
                bodyEl.innerHTML = normalize(b);
                bodyEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
              } else {
                bodyEl.value = b;
                bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          };
          
          const onDragLeave = (e) => {
            if (!e.relatedTarget || !document.contains(e.relatedTarget)) {
              document.querySelectorAll('.__ai_drop_highlight__')
                .forEach(n => n.classList.remove('__ai_drop_highlight__'));
            }
          };
 
          document.addEventListener('dragover',   onDragOver);
          document.addEventListener('drop',       onDrop);
          document.addEventListener('dragleave',  onDragLeave);
 
          // Cleanup after 60s or on next call
          const cleanup = () => {
            document.removeEventListener('dragover',  onDragOver);
            document.removeEventListener('drop',      onDrop);
            document.removeEventListener('dragleave', onDragLeave);
            document.querySelectorAll('.__ai_drop_highlight__')
              .forEach(n => n.classList.remove('__ai_drop_highlight__'));
          };
          window.__aiDropCleanup__ = cleanup;
          setTimeout(cleanup, 60000);
        },
        args: [subj, bdy],
      });
    } catch (err) {
      console.error('[AI Drag] registerDropTarget failed:', err);
    }
  };
 
  // ── HTML5 drag events on the handle ──────────────────────────────────────
  const onHandleDragStart = (e) => {
    // Store structured data — NOT plain text to avoid paste-as-text issues
    const payload = JSON.stringify({ subject: editSubject, body: editBody });
    e.dataTransfer.setData('application/x-ai-email', payload);
    e.dataTransfer.effectAllowed = 'copy';
 
    // Custom drag image: small pill label
    const pill = document.createElement('div');
    pill.textContent = '✉ Drag to Gmail';
    pill.style.cssText = [
      'position:fixed', 'top:-999px',
      'background:#111', 'color:#fff',
      'font:700 12px/1 -apple-system,sans-serif',
      'padding:8px 14px', 'border-radius:99px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.35)',
      'white-space:nowrap', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(pill);
    e.dataTransfer.setDragImage(pill, pill.offsetWidth / 2, 20);
    setTimeout(() => pill.remove(), 0);
 
    setIsDragging(true);
 
    // Inject drop listeners into the page
    registerDropTarget(editSubject, editBody);
  };
 
  const onHandleDragEnd = () => {
    setIsDragging(false);
  };
 
  const iconBtn = (label, clickFn, dragStartFn, dragEndFn, children) => (
    <button
      title={label}
      onClick={clickFn}
      draggable={!!dragStartFn}
      onDragStart={dragStartFn}
      onDragEnd={dragEndFn}
      style={{
        background: 'none', border: 'none',
        cursor: dragStartFn ? 'grab' : 'pointer',
        padding: '4px 6px', borderRadius: 6,
        display: 'flex', alignItems: 'center',
        color: '#aaa', transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f0f0ec'; e.currentTarget.style.color = '#111'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none';    e.currentTarget.style.color = '#aaa'; }}
    >
      {children}
    </button>
  );
 
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #eaeae6',
        borderRadius: 14,
        overflow: 'hidden',
        width: '100%',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        opacity: isDragging ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Card header */}
      <div style={{
        padding: '9px 10px 9px 13px',
        borderBottom: '1px solid #f2f2ee',
        display: 'flex', alignItems: 'center', gap: 7,
        background: '#fafaf8',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <polyline points="2,4 12,13 22,4"/>
        </svg>
        <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>
          Draft Email
        </span>
 
        {streaming && (
          <span style={{ fontSize: 10, color: '#ccc', fontFamily: 'DM Mono, monospace', marginRight: 4 }}>generating…</span>
        )}
 
        {/* Drag handle — draggable only this element */}
        {!streaming && iconBtn(
          'Drag to Gmail fields',
          null,
          onHandleDragStart,
          onHandleDragEnd,
          <svg width="14" height="14" viewBox="0 0 24 24">
            <circle cx="9"  cy="5"  r="1.5" fill="currentColor"/>
            <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
            <circle cx="9"  cy="19" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="5"  r="1.5" fill="currentColor"/>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        )}
 
        {/* Edit / Done */}
        {!streaming && iconBtn(
          isEditing ? 'Done editing' : 'Edit',
          () => setIsEditing(v => !v),
          null, null,
          isEditing
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        )}
      </div>
 
      <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Subject */}
        <div>
          <div style={{ fontSize: 10, color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Subject</div>
          {isEditing
            ? <input
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                style={{
                  width: '100%', fontSize: 14, fontWeight: 700, color: '#111',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', border: 'none',
                  borderBottom: '1.5px solid #e0e0dc', background: 'transparent',
                  outline: 'none', padding: '2px 0', lineHeight: 1.4,
                }}
              />
            : <div style={{ fontSize: 14, color: '#111', fontWeight: 700, lineHeight: 1.4, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {editSubject || <> <span style={{ color: '#e0e0dc' }}>—</span> <Cursor /> </>}
              </div>
          }
        </div>
 
        <div style={{ height: 1, background: '#f2f2ee' }} />
 
        {/* Body */}
        <div>
          <div style={{ fontSize: 10, color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Message</div>
          {isEditing
            ? <textarea
                ref={textareaRef}
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={6}
                style={{
                  width: '100%', fontSize: 13, color: '#555', lineHeight: 1.8,
                  fontFamily: 'DM Mono, monospace', border: 'none',
                  borderBottom: '1.5px solid #e0e0dc', background: 'transparent',
                  outline: 'none', resize: 'vertical', padding: '2px 0',
                }}
              />
            : <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8, fontFamily: 'DM Mono, monospace', whiteSpace: 'pre-wrap' }}>
                {editBody || <> <span style={{ color: '#101828' }}>Composing…</span> <Cursor /> </>}
              </div>
          }
        </div>
      </div>
    </div>
  );
}
