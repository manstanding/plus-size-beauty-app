const cartKey = 'plus-size-beauty-cart';
const appStateKey = 'plus-size-beauty-app-state';

function getCart() {
  try {
    const data = localStorage.getItem(cartKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
}

function getAppState() {
  try {
    const data = sessionStorage.getItem(appStateKey);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    return {};
  }
}

function saveAppState(state) {
  const currentState = getAppState();
  const nextState = { ...currentState, ...state };
  sessionStorage.setItem(appStateKey, JSON.stringify(nextState));
  return nextState;
}

function restoreAppState() {
  const state = getAppState();
  if (!state || !state.lastChat) return;

  const chatInputs = document.querySelectorAll('textarea, input[type="text"], [data-chat-input]');
  chatInputs.forEach((input) => {
    input.value = state.lastChat;
  });
}

function updateCartBadge() {
  const cartCountEls = document.querySelectorAll('.cart-count');
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  cartCountEls.forEach((el) => {
    el.textContent = count || 10;
  });
}

function generateQrCode() {
  const qrElement = document.getElementById('qr-code');
  if (!qrElement || !window.QRCode) return;

  const currentUrl = window.location.href;
  QRCode.toCanvas(
    qrElement,
    currentUrl,
    {
      width: 220,
      margin: 2,
      color: {
        dark: '#2b1b1b',
        light: '#ffffff'
      }
    },
    (error) => {
      if (error) console.error(error);
    }
  );
}

async function installPwa() {
  const installButton = document.getElementById('installAppBtn');
  if (!installButton) return;

  if (!window.deferredPrompt) {
    alert('The app is ready in your browser. You can still open this site normally on your phone.');
    return;
  }

  window.deferredPrompt.prompt();
  await window.deferredPrompt.userChoice;
  window.deferredPrompt = null;
  installButton.hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
  restoreAppState();

  const chatInputs = document.querySelectorAll('textarea, input[type="text"], [data-chat-input]');
  chatInputs.forEach((input) => {
    input.addEventListener('input', () => {
      saveAppState({ lastChat: input.value });
    });
  });

  const newsletterForms = document.querySelectorAll('.newsletter');
  newsletterForms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input');
      if (input) {
        input.value = '';
        input.placeholder = 'Thanks for joining!';
        saveAppState({ lastChat: '' });
      }
    });
  });

  const affiliateLinks = document.querySelectorAll('.affiliate-link, .link-card');
  affiliateLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const isLocal = link.getAttribute('href')?.startsWith('#');
      if (isLocal) return;
      event.preventDefault();
      window.open(link.href, '_blank', 'noopener,noreferrer');
    });
  });

  const downloadBtn = document.getElementById('downloadQr');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const canvas = document.getElementById('qr-code');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'plus-size-beauty-qr-code.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  const installButton = document.getElementById('installAppBtn');
  if (installButton) {
    installButton.addEventListener('click', installPwa);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.deferredPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  window.addEventListener('beforeunload', () => {
    const activeChatInput = document.querySelector('textarea, [data-chat-input]');
    if (activeChatInput) {
      saveAppState({ lastChat: activeChatInput.value });
    }
  });

  generateQrCode();
  updateCartBadge();
});
