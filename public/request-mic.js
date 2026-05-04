document.addEventListener('DOMContentLoaded', () => {
  
  const btn = document.getElementById('requestBtn');
  const status = document.getElementById('status');

  const urlParams = new URLSearchParams(window.location.search);
  const returnTabId = parseInt(urlParams.get('returnTo'));

  btn.addEventListener('click', async () => {

    try {

      btn.textContent = 'Requesting…';
      btn.disabled = true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      stream.getTracks().forEach(t => t.stop());
      status.innerHTML = '<span class="pulse"></span>Microphone access granted';
      status.className = 'status visible granted';
      btn.textContent = 'Access granted';

      if (returnTabId) {

          await chrome.tabs.update(returnTabId, { active: true });
      }

      window.close();

    } catch (err) {

      status.textContent = 'Access denied — enable it in your browser settings';
      status.className = 'status visible denied';
      btn.textContent = 'Allow microphone';
      btn.disabled = false;

    }

  });
});