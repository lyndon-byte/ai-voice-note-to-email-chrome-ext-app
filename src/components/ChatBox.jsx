import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { parse } from 'partial-json';
import EmailCard from './EmailCard';
import ChatBubble from './ChatBubble';
import AudioRecorder from './AudioRecorder';
import { useEffect, useState, useRef } from 'react'
import { ChatBoxEmptyPlaceholder } from './ChatBoxEmptyPlaceholder';

const ThinkingDots = () => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
    {['dot-1', 'dot-2', 'dot-3'].map(c => (
      <div key={c} className={c} style={{ width: 7, height: 7, borderRadius: '50%', background: '#bbb' }} />
    ))}
  </div>
);

export default function ChatBox({ chatId, initialMessages, token }) {

  const [isStreaming, setIsStreaming] = useState(false);
  const [emailMap, setEmailMap]       = useState({});
  const [inputText, setInputText]     = useState('');

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: 'http://localhost:3000/api/generate-email',
    }),
  });

 const insertIntoGmailStream = async (subjectText, bodyText, isDone = false) => {
  
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (subj, body, done) => {

          const TOAST_ID = '__ai_toast__';

          const injectStyles = () => {
            if (document.getElementById('__ai_toast_styles__')) return;
            const style = document.createElement('style');
            style.id = '__ai_toast_styles__';
            style.textContent = [
              '@keyframes ai-toast-in{from{opacity:0;transform:translateY(18px) scale(0.94)}to{opacity:1;transform:translateY(0) scale(1)}}',
              '@keyframes ai-toast-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(18px) scale(0.94)}}',
              '@keyframes ai-spin{to{transform:rotate(360deg)}}',
              '@keyframes ai-bar{0%,100%{transform:scaleY(0.35);opacity:0.4}50%{transform:scaleY(1);opacity:1}}',
              '#__ai_toast__{position:fixed;bottom:28px;right:28px;z-index:999999;background:#000;border-radius:22px;padding:20px 24px 20px 20px;display:flex;align-items:center;gap:18px;box-shadow:0 24px 64px rgba(0,0,0,.6),0 6px 16px rgba(0,0,0,.4);font-family:-apple-system,"Segoe UI",sans-serif;min-width:300px;max-width:400px;animation:ai-toast-in .32s cubic-bezier(.16,1,.3,1) both;pointer-events:none}',
              '#__ai_toast__.ai-toast-out{animation:ai-toast-out .22s ease forwards}',
              '#__ai_toast__ .__ti__{width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
              '#__ai_toast__ .__tb__{display:flex;flex-direction:column;gap:7px;flex:1;min-width:0}',
              '#__ai_toast__ .__tt__{font-size:16px;font-weight:800;color:#fff;letter-spacing:-.1px;line-height:1}',
              '#__ai_toast__ .__tf__{display:flex;gap:5px;flex-wrap:wrap}',
              '#__ai_toast__ .__tag__{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;background:rgba(255,255,255,.12);color:#fff;padding:4px 12px;border-radius:99px;border:1px solid rgba(255,255,255,.25)}',
              '#__ai_toast__ .__tr__{display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0}',
              '#__ai_toast__ .__sp__{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;animation:ai-spin .65s linear infinite}',
              '#__ai_toast__ .__bars__{display:flex;align-items:center;gap:3px;height:20px}',
              '#__ai_toast__ .__bars__ span{display:block;width:4px;height:18px;background:rgba(255,255,255,.7);border-radius:99px;transform-origin:center}',
              '#__ai_toast__ .__bars__ span:nth-child(1){animation:ai-bar .9s ease-in-out infinite 0s}',
              '#__ai_toast__ .__bars__ span:nth-child(2){animation:ai-bar .9s ease-in-out infinite .12s}',
              '#__ai_toast__ .__bars__ span:nth-child(3){animation:ai-bar .9s ease-in-out infinite .24s}',
              '#__ai_toast__ .__bars__ span:nth-child(4){animation:ai-bar .9s ease-in-out infinite .12s}',
              '#__ai_toast__ .__bars__ span:nth-child(5){animation:ai-bar .9s ease-in-out infinite 0s}',
            ].join('');
            document.head.appendChild(style);
          };

          const isVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0
              && getComputedStyle(el).visibility !== 'hidden'
              && getComputedStyle(el).display    !== 'none';
          };

          const subjectEl = document.querySelector('input[name="subjectbox"]');
          let bodyEl = null;
          for (const s of ['div[role="textbox"][contenteditable="true"]', 'div[aria-label*="Message body"]', '.Am']) {
            const el = document.querySelector(s);
            if (el) { bodyEl = el; break; }
          }

          const subjectVisible = isVisible(subjectEl);
          const bodyVisible    = isVisible(bodyEl);

          if (done) {
            const existing = document.getElementById(TOAST_ID);
            if (existing) {
              existing.classList.add('ai-toast-out');
              setTimeout(() => existing.remove(), 240);
            }
          }

          if (!done) {
            injectStyles();

            const fields = [];
            if (subjectVisible && subj) fields.push('Subject');
            if (bodyVisible    && body) fields.push('Body');
            if (!fields.length && (subjectVisible || bodyVisible)) fields.push('Email');

            let toast = document.getElementById(TOAST_ID);
            if (!toast) {
              toast = document.createElement('div');
              toast.id = TOAST_ID;
              toast.innerHTML =
                '<div class="__ti__">'
                + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round">'
                + '<circle cx="12" cy="12" r="3"/>'
                + '<path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>'
                + '</svg>'
                + '</div>'
                + '<div class="__tb__">'
                + '<div class="__tt__">AI is writing</div>'
                + '<div class="__tf__" id="__toast_fields__"></div>'
                + '</div>'
                + '<div class="__tr__">'
                + '<div class="__sp__"></div>'
                + '<div class="__bars__"><span></span><span></span><span></span><span></span><span></span></div>'
                + '</div>';
              document.body.appendChild(toast);
            }

            const fieldsEl = document.getElementById('__toast_fields__');
            if (fieldsEl) {
              fieldsEl.innerHTML = fields.map(f => '<span class="__tag__">' + f + '</span>').join('');
            }
          }

          if (subjectEl && subjectVisible && subjectEl.value !== subj) {
            const start = subjectEl.selectionStart;
            const end   = subjectEl.selectionEnd;
            subjectEl.value = subj;
            subjectEl.dispatchEvent(new Event('input', { bubbles: true }));
            if (start !== null && end !== null) subjectEl.setSelectionRange(start, end);
          }

          if (bodyEl && bodyVisible) {
            const normalize = (text) =>
                  text
                    .split('\n')
                    .map(line => `<div>${line || '<br>'}</div>`)
                    .join('');
            const newHTML   = normalize(body);
            if (bodyEl.innerHTML !== newHTML) {
              const selection = window.getSelection();
              let range = null;
              if (selection.rangeCount > 0) range = selection.getRangeAt(0);
              bodyEl.innerHTML = newHTML;
              bodyEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
              if (range) {
                try { selection.removeAllRanges(); selection.addRange(range); } catch(e) {}
              }
            }
          }
        },
        args: [subjectText, bodyText, isDone],
      });
    } catch (err) {
      console.error('[Gmail Inject] executeScript failed:', err);
    }
  };

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

      if (subject || body) {
        insertIntoGmailStream(subject, body, done);
      }

    } catch { /* partial — keep waiting */ }
  }, [messages]);

  useEffect(() => {
     requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    });
  }, [messages, isStreaming, emailMap]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '20px';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [inputText]);

  const handleSend = (text) => {
    const t = text.trim();
    if (!t) return;
    sendMessage(
      { text: t },
      {
        headers: { Authorization: `Bearer ${token}` },
        body: { chatId },
      },
    );
    setInputText('');
  };

  const lastAiMsg = messages.filter(m => m.role === 'assistant').at(-1);
  const isEmpty   = messages.length === 0 && status !== 'submitted';

  return (
    <>
      {isEmpty ? (
        <ChatBoxEmptyPlaceholder />
      ) : (
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

            {messages.map((msg) => {
              if (msg.role === 'user') {
                const text = msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '';
                return <ChatBubble key={msg.id} role="user">{text}</ChatBubble>;
              }

              if (msg.role === 'assistant') {
                const isLast    = msg === lastAiMsg;
                const streaming = isLast && isStreaming;
                const data      = emailMap[msg.id] || { subject: '', body: '' };
                return (
                  <ChatBubble key={msg.id} role="ai" naked>
                    <EmailCard subject={data.subject} body={data.body} streaming={streaming} />
                  </ChatBubble>
                );
              }

              return null;
            })}

            {(status === 'submitted' || status !== 'streaming') &&
            
              (() => {
                const lastMsg = messages.at(-1);

                return lastMsg?.role === 'user' ? (
                  <ChatBubble role="ai">
                    <ThinkingDots />
                  </ChatBubble>
                ) : null;
              })()}

            <div ref={bottomRef} style={{ height: 4 }} />
          </div>
        </div>
      )}

      {/* ── Sticky input footer ── */}
      <div 
      style={{
        background: '#fff',
        borderTop: isEmpty ? 'none' : '1px solid #eaeae6',
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
          
           <AudioRecorder

              onFinishTranscription={(transcription) => handleSend(transcription) }

          />

          <div style={{
            textAlign: 'center',
            fontSize: 10,
            color: '#ccc',
            fontFamily: 'DM Mono, monospace',
            letterSpacing: 0.4,
          }}>
            Talking to Eleven 
          </div>
        </div>
      </div>
    </>
  );
}