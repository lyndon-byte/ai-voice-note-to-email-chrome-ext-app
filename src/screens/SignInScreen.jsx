import { useState, useEffect } from 'react'
import { IconGoogle, IconMic } from '../components/icons/Icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase-config';
import { Loader } from '../components/Loader';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function SignInScreen(){

    const [authError, setAuthError] = useState('')
    const [authLoading,setAuthLoading] = useState(false)

    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";


    const sendExtensionMessage = (message, callback) => {

        if (typeof chrome?.runtime?.sendMessage === 'function') {

            chrome.runtime.sendMessage(message, callback)

        } else {

            callback({ success:false, error:'Chrome runtime is unavailable.' })
        }
    }
    
    const signIn = (e) => {

        e.preventDefault(); 

        setAuthError('')

        setAuthLoading(true)

        sendExtensionMessage({action:'signIn'},(response)=> {

            const user = response?.user||response

            if (response?.success&&user){ 

               console.log("user logged in: " + user);

            } else { 
                
                setAuthError(response?.error||'Sign-in failed.') 
            
            }

        })
    }

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            
            if (user) {

                setAuthLoading(false)
                navigate(from, { replace: true });
            }
        });

        return () => unsubscribe(); 

    }, [navigate, from]);


    if(authLoading) return (

        <Loader 
          label='Authenticating..' 
          color='bg-gray-900' 
        />
        
    )


    return (

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

}