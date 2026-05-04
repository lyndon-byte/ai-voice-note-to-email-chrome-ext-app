import { useEffect, useState, useRef } from 'react'
import { initializeApp } from "firebase/app";
import { getAuth, onIdTokenChanged } from "firebase/auth/web-extension";
import { firebaseConfig } from './config/firebase-config';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { parse } from 'partial-json';
import LandingScreen from './screens/LandingScreen';

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Processing Screen ────────────────────────────────────────────────────────
const ProcessingScreen = () => (
  <div className="w-full min-h-screen bg-white flex flex-col">
    <style>{`
      @keyframes robotFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      @keyframes eyeBlink { 0%,88%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.08)} }
      @keyframes scanBar { 0%{top:0;opacity:0.8} 100%{top:100%;opacity:0} }
      @keyframes dot1{0%,100%{opacity:0.2}30%{opacity:1}}
      @keyframes dot2{0%,100%{opacity:0.2}60%{opacity:1}}
      @keyframes dot3{0%,100%{opacity:0.2}90%{opacity:1}}
      @keyframes ringOut{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.6);opacity:0}}
    `}</style>
    <div className="px-5 pt-5 pb-2">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400">Voice to Email</p>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div style={{ position:'relative', width:96, height:96 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:8, border:'1px solid #e5e5e5', animation:'ringOut 1.6s ease-out infinite' }} />
        <div style={{ position:'absolute', inset:0, borderRadius:8, border:'1px solid #e5e5e5', animation:'ringOut 1.6s ease-out infinite 0.6s' }} />
        <div style={{ animation:'robotFloat 2s ease-in-out infinite' }}>
          {/* robot head */}
          <div style={{ width:64, height:52, background:'#171717', borderRadius:6, margin:'0 auto 4px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, right:0, height:1.5, background:'rgba(255,255,255,0.18)', animation:'scanBar 1.1s linear infinite', top:0 }} />
            <div style={{ display:'flex', justifyContent:'center', gap:12, paddingTop:14 }}>
              <div style={{ width:10, height:10, background:'white', borderRadius:2, animation:'eyeBlink 2.8s ease-in-out infinite' }} />
              <div style={{ width:10, height:10, background:'white', borderRadius:2, animation:'eyeBlink 2.8s ease-in-out infinite 0.12s' }} />
            </div>
            <div style={{ width:26, height:2.5, background:'rgba(255,255,255,0.25)', borderRadius:2, margin:'8px auto 0' }} />
          </div>
          {/* body */}
          <div style={{ width:68, height:28, background:'#262626', borderRadius:5, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:2, background:'#404040' }} />)}
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-black mb-2">Transcribing audio</p>
        <div className="flex gap-1.5 justify-center">
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#a3a3a3',display:'inline-block',animation:'dot1 1.2s ease-in-out infinite' }} />
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#a3a3a3',display:'inline-block',animation:'dot2 1.2s ease-in-out infinite' }} />
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#a3a3a3',display:'inline-block',animation:'dot3 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  </div>
)

// ─── Audio Player Bar ─────────────────────────────────────────────────────────
const AudioPlayerBar = ({ audioElRef, isPlaying, playElapsed, audioDuration, playProgress, togglePlay, seekBy }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-neutral-400 w-9 text-right tabular-nums">{formatTime(Math.floor(playElapsed))}</span>
      <div className="flex-1 h-1 bg-neutral-200 rounded-full">
        <div className="h-full bg-black rounded-full transition-all" style={{ width:`${playProgress*100}%` }} />
      </div>
      <span className="text-[10px] font-mono text-neutral-400 w-9 tabular-nums">{formatTime(Math.floor(audioDuration))}</span>
    </div>
    <div className="flex items-center justify-center gap-4">
      <button onClick={() => { if(audioElRef.current) audioElRef.current.currentTime=0 }} className="text-neutral-400 hover:text-black transition-colors p-1"><IconSkipBack /></button>
      <button onClick={() => seekBy(-5)} className="text-neutral-500 hover:text-black transition-colors p-1"><IconRewind5 /></button>
      <button onClick={togglePlay} className="w-9 h-9 rounded bg-black text-white flex items-center justify-center active:scale-95 transition-transform">
        {isPlaying ? <IconPause size={16}/> : <IconPlay size={16}/>}
      </button>
      <button onClick={() => seekBy(5)} className="text-neutral-500 hover:text-black transition-colors p-1"><IconFwd5 /></button>
      <button onClick={() => { if(audioElRef.current) audioElRef.current.currentTime=audioDuration }} className="text-neutral-400 hover:text-black transition-colors p-1"><IconSkipFwd /></button>
    </div>
  </div>
)

// ─── Recent Recordings ────────────────────────────────────────────────────────
const RecentRecordings = ({ recordings, onSelect, onDelete }) => {
  if (!recordings || recordings.length === 0) return null
  return (
    <div className="px-5 pb-4">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 mb-2">Recent Recordings</p>
      <div className="space-y-1.5">
        {recordings.map((rec, i) => (
          <div key={rec.id} className="flex items-center gap-2.5 p-2.5 border border-neutral-100 rounded bg-neutral-50 hover:bg-neutral-100 transition-colors">
            <div className="w-7 h-7 bg-black rounded flex items-center justify-center shrink-0 text-white">
              <IconPlay size={11}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-black truncate">{rec.title || `Recording ${i+1}`}</p>
              <p className="text-[10px] text-neutral-400">{formatTime(rec.duration||0)} · {rec.date}</p>
            </div>
            <div className="flex items-center gap-1">
              {rec.transcription ? (
                <button onClick={() => onSelect(rec)} className="text-[10px] font-medium text-neutral-600 border border-neutral-200 rounded px-2 py-1 hover:border-black hover:text-black transition-colors flex items-center gap-0.5">
                  View <IconChevronRight/>
                </button>
              ) : (
                <button onClick={() => onSelect(rec)} className="text-[10px] font-semibold text-white bg-black rounded px-2 py-1 hover:bg-neutral-700 transition-colors">
                  Process
                </button>
              )}
              <button onClick={() => onDelete(rec.id)} className="w-6 h-6 flex items-center justify-center text-neutral-300 hover:text-red-500 transition-colors rounded">
                <IconTrash size={12}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Drag props ───────────────────────────────────────────────────────────────
const makeDragProps = (text, isEditing) => {
  if (isEditing || !text) return {}
  return {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData('text/plain', text)
      e.dataTransfer.effectAllowed = 'copy'
      const ghost = document.createElement('div')
      ghost.textContent = `📋 ${text.slice(0,40)}${text.length>40?'…':''}`
      ghost.style.cssText = 'position:fixed;top:-999px;left:0;background:#000;color:#fff;font:12px/1.5 system-ui,sans-serif;padding:4px 10px;border-radius:4px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:9999;'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost,0,0)
      setTimeout(()=>document.body.removeChild(ghost),0)
    }
  }
}

// ─── Editable Field ───────────────────────────────────────────────────────────
const EditableField = ({ label, value, isEditing, setIsEditing, fieldRef, onDone, onInput, isStreaming, placeholder }) => (
  <div>
    {/* label row */}
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400">{label}</p>
        {!isEditing && value && (
          <span className="flex items-center gap-1 text-[9px] text-neutral-400 border border-dashed border-neutral-300 rounded px-1.5 py-0.5 select-none">
            <IconDrag/><span>drag</span><span className="text-neutral-300">·</span><IconEdit size={9}/><span>edit</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          title="Copy"
          className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-black border border-transparent hover:border-neutral-200 rounded transition-colors"
        >
          <IconCopy size={11}/>
        </button>
        {isEditing ? (
          <button
            onClick={onDone}
            className="text-[10px] font-semibold text-white bg-black rounded px-2.5 py-1 active:scale-95 transition-transform"
          >Done</button>
        ) : (
          <button
            onClick={() => {
              setIsEditing(true)
              setTimeout(()=>{
                if(fieldRef.current){
                  fieldRef.current.focus()
                  const r=document.createRange(); r.selectNodeContents(fieldRef.current); r.collapse(false)
                  const s=window.getSelection(); s.removeAllRanges(); s.addRange(r)
                }
              },0)
            }}
            className="text-[10px] font-medium text-neutral-500 border border-neutral-200 rounded px-2 py-1 hover:border-neutral-800 hover:text-black transition-colors flex items-center gap-1"
          >
            <IconEdit size={10}/> Edit
          </button>
        )}
      </div>
    </div>
    {/* field */}
    <div
      ref={fieldRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onInput={onInput}
      {...makeDragProps(value, isEditing)}
      className={[
        'text-[13px] text-black leading-relaxed whitespace-pre-wrap outline-none rounded p-2.5 border transition-all duration-150',
        isEditing
          ? 'border-neutral-800 bg-neutral-50 cursor-text'
          : value
            ? 'border-dashed border-neutral-200 cursor-grab active:cursor-grabbing hover:border-neutral-400 hover:bg-neutral-50'
            : 'border-neutral-100 bg-neutral-50'
      ].join(' ')}
    >
      {value || (
        isStreaming
          ? <span className="text-neutral-400 text-xs italic">Generating…</span>
          : <span className="text-neutral-400 text-xs italic">{placeholder}</span>
      )}
    </div>
  </div>
)

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {

  const [authLoading, setAuthLoading] = useState(true)
  const [authUser, setAuthUser]       = useState(null)
  const [authError, setAuthError]     = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL]       = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [emailBody, setEmailBody]     = useState('')
  const [emailData, setEmailData]     = useState({ subject:'', body:'' })
  const [elapsed, setElapsed]         = useState(0)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playElapsed, setPlayElapsed] = useState(0)
  const [authToken, setAuthToken]     = useState('')
  const [tone, setTone]               = useState('professional')
  const [recentRecordings, setRecentRecordings] = useState([])
  const [isEditingSubject, setIsEditingSubject] = useState(false)
  const [isEditingBody, setIsEditingBody]       = useState(false)
  const [showRegenerateInput, setShowRegenerateInput] = useState(false)
  const [regenerateNote, setRegenerateNote] = useState('')

  const subjectRef      = useRef(null)
  const bodyRef         = useRef(null)
  const audioChunksRef  = useRef([])
  const analyserRef     = useRef(null)
  const audioCtxRef     = useRef(null)
  const streamRef       = useRef(null)
  const timerRef        = useRef(null)
  const audioElRef      = useRef(null)

  const TONES = ['professional','casual','formal','friendly','concise']

  const sendExtensionMessage = (message, callback) => {
    if (typeof chrome?.runtime?.sendMessage === 'function') {
      chrome.runtime.sendMessage(message, callback)
    } else {
      callback({ success:false, error:'Chrome runtime is unavailable.' })
    }
  }

  // authguard

  useEffect(()=>{
    setAuthLoading(true); setAuthError('')
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    onIdTokenChanged(auth, async(user)=>{
      if(user){ const token=await user.getIdToken(); setAuthUser(user); setAuthToken(token); loadRecentRecordings() }
      else { setAuthUser(null); setAuthError("can't find authenticated session") }
      setAuthLoading(false)
    })
  },[])

  const loadRecentRecordings = () => {
    try { const s=localStorage.getItem('voiceEmailRecordings'); if(s) setRecentRecordings(JSON.parse(s)) } catch{}
  }
  const saveRecordingToStorage = (rec) => {
    try {
      const s=localStorage.getItem('voiceEmailRecordings')
      const list=s?JSON.parse(s):[]
      const updated=[rec,...list].slice(0,5)
      localStorage.setItem('voiceEmailRecordings',JSON.stringify(updated))
      setRecentRecordings(updated)
    } catch{}
  }
  const deleteRecording = (id) => {
    try {
      const updated=recentRecordings.filter(r=>r.id!==id)
      localStorage.setItem('voiceEmailRecordings',JSON.stringify(updated))
      setRecentRecordings(updated)
    } catch{}
  }

  const signIn = () => {
    setAuthLoading(true); setAuthError('')
    sendExtensionMessage({action:'signIn'},(response)=>{
      const user=response?.user||response
      if(response?.success&&user){ console.log(`user logged in: ${user}`) }
      else { setAuthUser(null); setAuthError(response?.error||'Sign-in failed.') }
      setAuthLoading(false)
    })
    
  }

  const setupAnalyser = async() => {
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      streamRef.current=stream
      const audioCtx=new AudioContext(); 
      audioCtxRef.current=audioCtx
      const source=audioCtx.createMediaStreamSource(stream)
      const analyser=audioCtx.createAnalyser(); 
      analyser.fftSize=256
      source.connect(analyser); analyserRef.current=analyser
    } catch { analyserRef.current=null }
  }

  const teardownAnalyser = () => {
    streamRef.current?.getTracks().forEach(t=>t.stop())
    audioCtxRef.current?.close()
    streamRef.current=null; audioCtxRef.current=null; analyserRef.current=null
  }

  const startRecording = async() => {
    try {
      setErrorMessage(''); setElapsed(0)
      await setupAnalyser()
      sendExtensionMessage({action:'startRecording'},(response)=>{
        if(response?.success){
          setIsRecording(true)
          timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000)
        } else { teardownAnalyser(); setErrorMessage(response?.error||'Failed to start recording') }
      })
    } catch(error){ setErrorMessage(error.message||'Error starting recording') }
  }

  const stopRecording = async() => {
    clearInterval(timerRef.current); teardownAnalyser()
    try {
      sendExtensionMessage({action:'stopRecording'},(response)=>{
        if(response?.success){
          const {audioData,mimeType}=response
          if(!audioData){ setErrorMessage('No audio data returned.'); return }
          const blob=base64ToBlob(audioData,mimeType||'audio/webm')
          const url=URL.createObjectURL(blob)
          setAudioURL(url); setIsRecording(false)
          const id=Date.now().toString()
          saveRecordingToStorage({
            id, title:`Recording ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`,
            duration:elapsed, date:new Date().toLocaleDateString([],{month:'short',day:'numeric'}),
            transcription:null
          })
        } else { setErrorMessage(response?.error||'Failed to stop recording') }
      })
    } catch(error){ setErrorMessage(error.message||'Error stopping recording') }
  }

  const base64ToBlob = (base64,type='audio/webm') => {
    const binary=atob(base64); const bytes=new Uint8Array(binary.length)
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i)
    return new Blob([bytes],{type})
  }

  const resetRecording = () => {
    setAudioURL(null); setErrorMessage(''); setEmailBody(''); setEmailData({subject:'',body:''})
    setElapsed(0); setIsPlaying(false); setPlayProgress(0); setPlayElapsed(0)
    setIsEditingSubject(false); setIsEditingBody(false)
    setShowRegenerateInput(false); setRegenerateNote('')
    audioChunksRef.current=[]
    if(subjectRef.current) subjectRef.current.innerText=''
    if(bodyRef.current) bodyRef.current.innerText=''
  }

  const togglePlay = () => {
    const el=audioElRef.current; if(!el) return
    if(isPlaying){el.pause();setIsPlaying(false)} else {el.play();setIsPlaying(true)}
  }
  const seekBy = (secs) => {
    const el=audioElRef.current; if(!el) return
    el.currentTime=Math.max(0,Math.min(el.duration,el.currentTime+secs))
  }

  useEffect(()=>{
    const el=audioElRef.current; if(!el||!audioURL) return
    el.src=audioURL
    const onLoaded=()=>setAudioDuration(el.duration||0)
    const onTime=()=>{setPlayElapsed(el.currentTime);setPlayProgress(el.duration?el.currentTime/el.duration:0)}
    const onEnded=()=>{setIsPlaying(false);setPlayProgress(0);setPlayElapsed(0)}
    el.addEventListener('loadedmetadata',onLoaded); el.addEventListener('timeupdate',onTime); el.addEventListener('ended',onEnded)
    return()=>{el.removeEventListener('loadedmetadata',onLoaded);el.removeEventListener('timeupdate',onTime);el.removeEventListener('ended',onEnded)}
  },[audioURL])

  const {messages,sendMessage,status} = useChat({
    transport: new DefaultChatTransport({api:'http://localhost:3000/api/generate-email'}),
  })

  const completionStreamRef = useRef({
    subject: '',
    body: ''
  })

  const sanitize = (text = '') => {
    return text
      .replace(/\\n/g, '\n')        // decode newline
      .replace(/\{\{.*?\}\}/g, '')  // remove template artifacts
      .replace(/\\"/g, '"')         // fix escaped quotes
  }
    
  useEffect(() => {
    const last = [...messages].reverse().find(m => m.role === 'assistant')
    if (!last) return

    const fullText = last.parts
      ?.filter(p => p.type === 'text')
      .map(p => p.text)
      .join('') || ''

    try {
      const parsed = parse(fullText)

      const subject = parsed?.emailMessage?.emailSubject || ''
      let body = parsed?.emailMessage?.emailBody || ''

      // CLEANING IS STILL REQUIRED
      body = sanitize(body)
      
      insertIntoGmailStream(subject, body)

    } catch {
      // parsing may still fail on very early tokens
    }
  }, [messages])

  const sendToAPI = async() => {
    if(!audioURL||!authUser) return
    setIsProcessing(true); setErrorMessage(''); setEmailBody('')
    try {
      const response=await fetch(audioURL)
      const audioBlob=await response.blob()
      const audioFile=new File([audioBlob],'recording.webm',{type:'audio/webm'})
      const formData=new FormData(); formData.append("file",audioFile)
      const res=await fetch("http://localhost:3000/api/transcribe",{method:"POST",headers:{Authorization:`Bearer ${authToken}`},body:formData})
      if(!res.ok){ const t=await res.text().catch(()=>''); throw new Error(`API request failed (${res.status}): ${t}`) }
      const data=await res.json()
      sendMessage({text:data.transcription},{body:{fileUrl:data.fileUrl,rawTranscription:data.transcription,tone},headers:{Authorization:`Bearer ${authToken}`}})
    } catch(error){ setEr3432wrorMessage(error.message||'Failed to process audio') }
    finally { setIsProcessing(false) }
  }

  const regenerateEmail = () => {
    const lastUserMsg=[...messages].reverse().find(m=>m.role==='user')
    if(!lastUserMsg) return
    const transcription=lastUserMsg.parts?.filter(p=>p.type==='text').map(p=>p.text).join('')||''
    setEmailBody(''); setEmailData({subject:'',body:''})
    sendMessage({text:transcription+(regenerateNote?`\n\nNote: ${regenerateNote}`:'')}
      ,{body:{rawTranscription:transcription,tone},headers:{Authorization:`Bearer ${authToken}`}})
    setShowRegenerateInput(false); setRegenerateNote('')
  }

const insertIntoGmailStream = async (subjectText, bodyText) => {

  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (subj, body) => {
        // --- SUBJECT ---
        const subjectEl = document.querySelector('input[name="subjectbox"]')

        if (subjectEl) {
          if (subjectEl.value !== subj) {
            const start = subjectEl.selectionStart
            const end = subjectEl.selectionEnd

            subjectEl.value = subj

            subjectEl.dispatchEvent(new Event('input', { bubbles: true }))

            // restore cursor
            if (start !== null && end !== null) {
              subjectEl.setSelectionRange(start, end)
            }
          }
        }

        // --- BODY ---
        const selectors = [
          'div[role="textbox"][contenteditable="true"]',
          'div[aria-label*="Message body"]',
          '.Am'
        ]

        let bodyEl = null
        for (const s of selectors) {
          bodyEl = document.querySelector(s)
          if (bodyEl) break
        }

        if (bodyEl) {
          // Gmail uses <div><br></div> structure
          const normalize = (text) =>
            text.replace(/\n/g, '<div><br></div>')
          
          const newHTML = normalize(body)

          if (bodyEl.innerHTML !== newHTML) {
            // Save cursor position
            const selection = window.getSelection()
            let range = null

            if (selection.rangeCount > 0) {
              range = selection.getRangeAt(0)
            }

            bodyEl.innerHTML = newHTML

            // Trigger Gmail internal update
            bodyEl.dispatchEvent(new InputEvent('input', { bubbles: true }))

            // Restore cursor safely
            if (range) {
              try {
                selection.removeAllRanges()
                selection.addRange(range)
              } catch {}
            }
          }
        }
      },
      args: [subjectText, bodyText]
    })
  } catch (err) {
    console.error('Streaming inject failed:', err)
  }
 }

  const downloadAudio = () => {
    if(!audioURL) return
    const link=document.createElement('a'); link.href=audioURL
    link.download=`voice-note-${Date.now()}.webm`
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  // ─── Views ────────────────────────────────────────────────────────────────
  if(authLoading) return (
    <div className="w-full min-h-screen bg-white flex items-center justify-center">
      <p className="text-xs text-neutral-400">Checking authentication…</p>
    </div>
  )

  if(!authUser) return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="px-5 pt-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400">Voice to Email</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-7" style={{animation:'fadeUp 0.4s ease both'}}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-black rounded flex items-center justify-center text-white">
            <IconMic size={26}/>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-black tracking-tight">Voice to Email</p>
            <p className="text-xs text-neutral-500 mt-0.5">Record. Transcribe. Send.</p>
          </div>
        </div>
        <div className="w-full space-y-1.5">
          {['Record voice notes instantly','AI transcription & email generation','Insert directly into Gmail'].map((f,i)=>(
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border border-neutral-100 rounded bg-neutral-50">
              <div className="w-1.5 h-1.5 rounded-full bg-black shrink-0"/>
              <p className="text-xs text-neutral-700">{f}</p>
            </div>
          ))}
        </div>
        {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}
        <button onClick={signIn} className="w-full py-3 border border-neutral-200 text-black rounded text-sm font-medium hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5">
          <IconGoogle/> Sign in with Google
        </button>
      </div>
    </div>
  )

  if(isProcessing||(status==='streaming'&&!emailData.body&&!emailData.subject)) return (
    <><audio ref={audioElRef} style={{display:'none'}}/><ProcessingScreen/></>
  )

  // ── EMAIL VIEW ──────────────────────────────────────────────────────────────
  if(emailBody) return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <audio ref={audioElRef} style={{display:'none'}}/>

      {/* header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400">Voice to Email</p>
        <button onClick={resetRecording} className="text-[11px] text-neutral-500 hover:text-black border border-neutral-200 rounded px-2.5 py-1 transition-colors">
          New
        </button>
      </div>

      {/* tone */}
      <div className="px-5 py-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 shrink-0">Tone</p>
          <div className="flex gap-1.5 flex-wrap">
            {TONES.map(t=>(
              <button key={t} onClick={()=>setTone(t)} className={`text-[11px] font-medium px-2.5 py-1 rounded transition-all capitalize border ${tone===t?'bg-black text-white border-black':'text-neutral-500 border-neutral-200 hover:border-neutral-600 hover:text-black'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-5 mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-600">{errorMessage}</div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* subject */}
        <EditableField
          label="Subject"
          value={emailData.subject}
          isEditing={isEditingSubject}
          setIsEditing={setIsEditingSubject}
          fieldRef={subjectRef}
          onDone={()=>{setIsEditingSubject(false);if(subjectRef.current) setEmailData(d=>({...d,subject:subjectRef.current.innerText}))}}
          onInput={e=>isEditingSubject&&setEmailData(d=>({...d,subject:e.currentTarget.innerText}))}
          isStreaming={status==='streaming'}
          placeholder="No subject generated…"
        />

        {/* insert subject only */}
        <button
          onClick={()=>insertIntoGmail('subject')}
          className="text-[11px] text-neutral-500 border border-neutral-200 rounded px-2.5 py-1.5 hover:border-neutral-600 hover:text-black transition-colors flex items-center gap-1.5"
        >
          <IconInsert size={11}/> Insert subject only
        </button>

        <div className="border-t border-neutral-100"/>

        {/* body */}
        <EditableField
          label="Email Body"
          value={emailData.body}
          isEditing={isEditingBody}
          setIsEditing={setIsEditingBody}
          fieldRef={bodyRef}
          onDone={()=>{setIsEditingBody(false);if(bodyRef.current){setEmailData(d=>({...d,body:bodyRef.current.innerText}));setEmailBody(bodyRef.current.innerText)}}}
          onInput={e=>{if(isEditingBody){setEmailData(d=>({...d,body:e.currentTarget.innerText}));setEmailBody(e.currentTarget.innerText)}}}
          isStreaming={status==='streaming'}
          placeholder="No body generated…"
        />

        {/* insert body only */}
        <button
          onClick={()=>insertIntoGmail('body')}
          className="text-[11px] text-neutral-500 border border-neutral-200 rounded px-2.5 py-1.5 hover:border-neutral-600 hover:text-black transition-colors flex items-center gap-1.5"
        >
          <IconInsert size={11}/> Insert body only
        </button>

        {/* regenerate */}
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <button
              onClick={regenerateEmail}
              className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded text-xs font-medium hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <IconRefresh size={12}/> Regenerate
            </button>
            <button
              onClick={()=>setShowRegenerateInput(v=>!v)}
              className={`flex-1 py-2 border rounded text-xs font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${showRegenerateInput?'border-black text-black bg-neutral-50':'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-black'}`}
            >
              <IconRefresh size={12}/> With note
            </button>
          </div>
          {showRegenerateInput && (
            <div className="flex gap-2">
              <input
                value={regenerateNote}
                onChange={e=>setRegenerateNote(e.target.value)}
                placeholder="e.g. make it shorter, add urgency…"
                className="flex-1 text-xs px-3 py-2 border border-neutral-200 rounded outline-none focus:border-neutral-800 transition-colors placeholder-neutral-400"
              />
              <button onClick={regenerateEmail} className="px-3 py-2 bg-black text-white rounded text-xs font-semibold active:scale-95 transition-transform">Go</button>
            </div>
          )}
        </div>
      </div>

      {/* bottom */}
      <div className="border-t border-neutral-100 px-5 pt-3 pb-4 space-y-3">
        <button
          onClick={()=>insertIntoGmail('both')}
          className="w-full py-2.5 bg-black text-white rounded text-sm font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <IconInsert size={14}/> Insert Subject &amp; Body into Gmail
        </button>
        <button
          onClick={()=>navigator.clipboard.writeText(`${emailData.subject}\n\n${emailData.body||emailBody}`)}
          className="w-full py-2.5 border border-neutral-200 text-neutral-600 rounded text-sm font-medium hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <IconCopy size={13}/> Copy all
        </button>

        {/* audio player */}
        {audioDuration > 0 && (
          <div className="pt-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 mb-2">Recording Playback</p>
            <AudioPlayerBar
              audioElRef={audioElRef} isPlaying={isPlaying} playElapsed={playElapsed}
              audioDuration={audioDuration} playProgress={playProgress} togglePlay={togglePlay} seekBy={seekBy}
            />
          </div>
        )}
      </div>
    </div>
  )

  // ── PLAYBACK VIEW ───────────────────────────────────────────────────────────
  if(audioURL&&!isRecording) return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <audio ref={audioElRef} style={{display:'none'}}/>

      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400">Voice to Email</p>
        <p className="text-xs text-neutral-400 truncate max-w-40">{authUser.displayName||authUser.email||'User'}</p>
      </div>

      {/* recording card */}
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-black rounded flex items-center justify-center text-white shrink-0">
            <IconMic size={16}/>
          </div>
          <div>
            <p className="text-sm font-semibold text-black">voice-note.webm</p>
            <p className="text-xs text-neutral-400">{formatTime(elapsed)} recorded</p>
          </div>
          <button onClick={downloadAudio} className="ml-auto w-8 h-8 border border-neutral-200 rounded flex items-center justify-center text-neutral-400 hover:border-neutral-600 hover:text-black transition-colors">
            <IconDownload size={14}/>
          </button>
        </div>
        <AudioPlayerBar
          audioElRef={audioElRef} isPlaying={isPlaying} playElapsed={playElapsed}
          audioDuration={audioDuration} playProgress={playProgress} togglePlay={togglePlay} seekBy={seekBy}
        />
      </div>

      {/* tone */}
      <div className="px-5 py-3 border-b border-neutral-100">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 mb-2">Email Tone</p>
        <div className="flex gap-1.5 flex-wrap">
          {TONES.map(t=>(
            <button key={t} onClick={()=>setTone(t)} className={`text-[11px] font-medium px-2.5 py-1 rounded transition-all capitalize border ${tone===t?'bg-black text-white border-black':'text-neutral-500 border-neutral-200 hover:border-neutral-600 hover:text-black'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-3">
        <VoiceWaveform isRecording={isPlaying} analyserNode={null} height={36}/>
      </div>

      {errorMessage && (
        <div className="mx-5 mb-2 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-600">{errorMessage}</div>
      )}

      <div className="px-5 pb-5 space-y-2 mt-auto">
        <button
          onClick={sendToAPI}
          disabled={isProcessing}
          className="w-full py-3 bg-black text-white rounded text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isProcessing?(<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Processing…</>):'Transcribe & Generate Email'}
        </button>
        <button onClick={resetRecording} className="w-full py-2.5 border border-neutral-200 text-neutral-500 rounded text-sm font-medium active:scale-[0.98] transition-all hover:bg-neutral-50">
          Discard &amp; New Recording
        </button>
      </div>
    </div>
  )

  // ── RECORDING VIEW ──────────────────────────────────────────────────────────
  return (
    <div>
      <LandingScreen/>
    </div>
  )
}