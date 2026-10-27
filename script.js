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

function persistCurrentInputs() {
  const targetInputs = document.querySelectorAll('input, textarea, [data-chat-input]');
  const snapshot = {};

  targetInputs.forEach((input) => {
    const key = input.name || input.id || input.getAttribute('aria-label') || 'field';
    if (input.value && key) {
      snapshot[key] = input.value;
    }
  });

  if (Object.keys(snapshot).length) {
    saveAppState({ inputs: snapshot });
  }
}

function restoreAppState() {
  const state = getAppState();
  const savedInputs = state?.inputs || {};

  Object.entries(savedInputs).forEach(([key, value]) => {
    const match = document.querySelector(`[name="${CSS.escape(key)}"]`) ||
      document.getElementById(key) ||
      document.querySelector(`textarea[aria-label="${CSS.escape(key)}"]`) ||
      document.querySelector(`input[aria-label="${CSS.escape(key)}"]`);

    if (match && typeof value === 'string') {
      match.value = value;
    }
  });

  const newsletterInput = document.querySelector('.newsletter input');
  if (newsletterInput && state?.newsletterEmail) {
    newsletterInput.value = state.newsletterEmail;
  }
}

function updateCartBadge() {
  const cartCountEls = document.querySelectorAll('.cart-count');
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  cartCountEls.forEach((el) => {
    el.textContent = count || 10;
  });
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('site-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add('visible');

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

function setRevealObserver() {
  const revealEls = document.querySelectorAll(
    '.category-tile, .product-card, .media-card, .link-card, .app-panel, .qr-box, .section-heading'
  );

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealEls.forEach((el) => observer.observe(el));
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
    showToast('The app is ready in your browser. You can still open this site normally on your phone.');
    return;
  }

  window.deferredPrompt.prompt();
  await window.deferredPrompt.userChoice;
  window.deferredPrompt = null;
  installButton.hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
  restoreAppState();
  setRevealObserver();

  const newsletterForms = document.querySelectorAll('.newsletter');
  newsletterForms.forEach((form) => {
    const input = form.querySelector('input');

    if (input) {
      input.addEventListener('input', () => {
        saveAppState({ newsletterEmail: input.value });
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input');
      if (!input) return;

      if (!input.value.trim() || !input.value.includes('@')) {
        showToast('Please enter a valid email address.', 'error');
        input.focus();
        return;
      }

      saveAppState({ newsletterEmail: input.value.trim() });
      input.value = '';
      input.placeholder = 'Thanks for joining!';
      showToast('You’re on the list—welcome to the glow!');
    });
  });

  const inputFields = document.querySelectorAll('input, textarea, [data-chat-input]');
  inputFields.forEach((input) => {
    input.addEventListener('input', () => {
      if (input.value) {
        saveAppState({ inputs: { ...(getAppState().inputs || {}), [input.name || input.id || 'email-field']: input.value } });
      }
    });
  });

  const affiliateLinks = document.querySelectorAll('.affiliate-link, .link-card');
  affiliateLinks.forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer sponsored');

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
      showToast('QR code downloaded.');
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
    persistCurrentInputs();
  });

  generateQrCode();
  updateCartBadge();
});
