    // This URL must point to the public site
const _URL = 'https://voice-note-ai-authenticator.web.app';
const iframe = document.createElement('iframe');

iframe.src = _URL;
document.documentElement.appendChild(iframe);

chrome.runtime.onMessage.addListener(handleChromeMessages);

function handleChromeMessages(message, sender, sendResponse) {
      // Extensions may have an number of other reasons to send messages, so you
      // should filter out any that are not meant for the offscreen document.
    if (message.target !== 'offscreen') {

        return false;

    }

    function handleIframeMessage({data}) {

        try {
          if (data.startsWith('!_{')) {
            // Other parts of the Firebase library send messages using postMessage.
            // You don't care about them in this context, so return early.
            return;
          }
          data = JSON.parse(data);
          self.removeEventListener('message', handleIframeMessage);

          sendResponse(data);
        } catch (e) {
          console.log(`json parse failed - ${e.message}`);
        }

    }

    globalThis.addEventListener('message', handleIframeMessage, false);

    iframe.contentWindow.postMessage({"initAuth": true}, new URL(_URL).origin);
    return true;
}
    

