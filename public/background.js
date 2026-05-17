import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithCredential  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-web-extension.js";

const firebaseConfig = {

  apiKey: "AIzaSyAltIkpCZYgKyLaFrmN8KUZNNMvEmTA4eo",
  authDomain: "voice-note-to-email-ai.firebaseapp.com",
  projectId: "voice-note-to-email-ai",
  storageBucket: "voice-note-to-email-ai.firebasestorage.app",
  messagingSenderId: "897803120673",
  appId: "1:897803120673:web:6c087885f541d13904b360",

};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app)


const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// A global promise to avoid concurrency issues
let creatingOffscreenDocument;

// Chrome only allows for a single offscreenDocument. This is a helper function
// that returns a boolean indicating if a document is already active.
async function hasDocument() {
  const matchedClients = await clients.matchAll();
  return matchedClients.some((c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH));
}


function normalizeUser(auth) {
  if (!auth) return null
  const candidate = auth.currentUser ?? auth.user ?? auth
  if (!candidate) return null
  return {
    uid: candidate.uid || null,
    email: candidate.email || null,
    displayName: candidate.displayName || null
  }
}

function normalizeAuthData(authResult) {
  if (!authResult) return null
  
  const { user, token } = authResult
  const normalizedUser = normalizeUser(user)
  
  return {
    user: normalizedUser,
    token,
    timestamp: Date.now()
  }
}

async function setupOffscreenDocument(path) {
  if (!(await hasDocument())) {
    if (creatingOffscreenDocument) {
      await creatingOffscreenDocument;
    } else {
      creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'authentication'
      });
      await creatingOffscreenDocument;
      creatingOffscreenDocument = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function requestAuthFromOffscreen() {
  return new Promise(async (resolve, reject) => {
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
    chrome.runtime.sendMessage(
      { type: 'firebase-auth', target: 'offscreen' },
      (auth) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }
        auth?.name !== 'FirebaseError' ? resolve(auth) : reject(auth)
      }
    )
  })
}

async function firebaseAuth() {

  try {

    const requestedOffScreenAuth = await requestAuthFromOffscreen()
    const credential = GoogleAuthProvider.credentialFromResult(requestedOffScreenAuth.credential);
    
    try {

      const userCredential = await signInWithCredential(auth, credential);
            
      return { user: userCredential.user };

    } catch (error) {

      console.error(error);
      throw error; 

    }
      

  } catch (err) {

    if (err?.code === 'auth/operation-not-allowed') {
      console.error('You must enable an OAuth provider in the Firebase' +
        ' console in order to use signInWithPopup. This sample' +
        ' uses Google by default.')
    } else {
      console.error(err)
    }
    return null

  } finally {

    await closeOffscreenDocument()
    
  }
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
    
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'signIn') {

    firebaseAuth()
      .then(async (authResult) => {

        if (authResult) {
          
          const authData = normalizeAuthData(authResult)

          sendResponse({
            success: true,
            user: authData.user.displayName
          })

        } else {

          sendResponse({
            success: false,
            error: 'Sign-in failed or user not authenticated'
          })

        }
      })
      .catch(async (error) => {

        console.error('Sign-in error:', error)
       
        sendResponse({
          success: false,
          error: error?.message || 'Authentication failed'
        })

      })

    return true
  }

})


// Helper function to check if URL is valid for content scripts
function isValidContentScriptUrl(url) {

  if (!url) return false
  
  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'file://',
  ]
  
  return !invalidPrefixes.some(prefix => url.startsWith(prefix))

}
