/* ============================================================
   BIZBHARAT — Frontend Application JavaScript
   ============================================================ */

// ─── Configuration ────────────────────────────────────────────
const CONFIG = {
  SUPABASE_URL: 'https://dxitvxmwnnoxrlbacnjv.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable__i3p5TOkoeE7y5Zg-BzCNw_6jOHryYs',
};

// ─── DOM Ready ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initSmoothScroll();
  initScrollAnimations();
  initFAQ();
  loadProducts();
});

// ============================================================
//  TOAST NOTIFICATION SYSTEM
// ============================================================
const Toast = (() => {
  let container = document.getElementById('toast-container');

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(type, title, message, duration = 5000) {
    const c = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));
    c.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => dismiss(toast), duration);
    }

    return toast;
  }

  function dismiss(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }

  return {
    success: (title, msg, d) => show('success', title, msg, d),
    error: (title, msg, d) => show('error', title, msg, d),
  };
})();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
//  STICKY HEADER WITH GLASS-MORPHISM
// ============================================================
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  let ticking = false;
  const threshold = 40;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > threshold) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============================================================
//  MOBILE MENU
// ============================================================
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (!hamburger || !drawer || !overlay) return;

  function openMenu() {
    hamburger.classList.add('active');
    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('active');
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    if (drawer.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', closeMenu);

  // Close menu when a link is clicked
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

// ============================================================
//  SMOOTH SCROLL
// ============================================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ============================================================
//  SCROLL ANIMATIONS (IntersectionObserver)
// ============================================================
function initScrollAnimations() {
  const elements = document.querySelectorAll('.anim-hidden');
  if (!elements.length) return;

  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(el => {
      el.classList.remove('anim-hidden');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        entry.target.classList.remove('anim-hidden');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  });

  elements.forEach(el => observer.observe(el));
}

// Helper to observe newly-added elements (e.g., product cards)
function observeNewElements(elements) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(el => el.classList.remove('anim-hidden'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        entry.target.classList.remove('anim-hidden');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  });

  elements.forEach(el => observer.observe(el));
}

// ============================================================
//  FAQ ACCORDION
// ============================================================
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all
      items.forEach(i => {
        i.classList.remove('active');
        const a = i.querySelector('.faq-answer');
        if (a) a.style.maxHeight = null;
      });

      // Open clicked (if was closed)
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

// ============================================================
//  LOAD PRODUCTS
// ============================================================
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // Show skeleton loaders
  grid.innerHTML = Array.from({ length: 6 }, () => `
    <div class="product-skeleton">
      <div class="skeleton-cover"></div>
      <div class="skeleton-body">
        <div class="skeleton-line skeleton-line--short"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line--price"></div>
      </div>
    </div>
  `).join('');

  try {
    const res = await fetch('/products.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
    renderProducts(products, grid);
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 16px;">
          Unable to load products right now.
        </p>
        <button onclick="loadProducts()" class="btn-outline" style="display:inline-flex;">
          Try Again
        </button>
      </div>
    `;
  }
}

function renderProducts(products, grid) {
  const bookIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>`;

  const coverBaseUrl = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL'
    ? `${CONFIG.SUPABASE_URL}/storage/v1/object/public/`
    : '';

  // Store products for later reference by index
  window.__products = products;

  grid.innerHTML = products.map((p, i) => {
    // Handle cover_image: full URL, relative path, or Supabase storage path
    let coverSrc = p.cover_image;
    if (!coverSrc.startsWith('http') && !coverSrc.startsWith('img/')) {
      coverSrc = coverBaseUrl ? `${coverBaseUrl}${p.cover_image}` : '';
    }
    const discount = Math.round((1 - p.price / p.original_price) * 100);

    return `
      <article class="product-card anim-hidden" style="animation-delay: ${i * 0.1}s" data-product-id="${p.id}">
        <div class="product-cover">
          ${coverSrc
            ? `<img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.parentElement.innerHTML = '<div class=\\'product-cover-placeholder\\'>${bookIconSVG}<span>Preview</span></div>'">`
            : `<div class="product-cover-placeholder">${bookIconSVG}<span>Preview</span></div>`
          }
          <span class="product-badge">${escapeHtml(p.category)}</span>
          <span class="product-discount">${discount}% OFF</span>
        </div>
        <div class="product-body">
          <h3 class="product-title">${escapeHtml(p.title)}</h3>
          <p class="product-desc">${escapeHtml(p.description)}</p>
          <div class="product-footer">
            <div class="product-price">
              <span class="price-current">₹${p.price}</span>
              <span class="price-original">₹${p.original_price}</span>
            </div>
            <button class="btn-buy" data-product-index="${i}" aria-label="Buy ${escapeHtml(p.title)}">
              <span class="btn-buy-label">Buy Now</span>
              <span class="spinner"></span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Attach click handlers via event delegation (avoids inline JSON escaping issues)
  grid.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-product-index'), 10);
      openBuyModal(JSON.stringify(window.__products[idx]));
    });
  });

  // Observe new cards for scroll animation
  observeNewElements(grid.querySelectorAll('.anim-hidden'));
}

// ============================================================
//  BUY NOW MODAL
// ============================================================
let currentProduct = null;

function openBuyModal(productJson) {
  // Validate config
  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    Toast.error('Configuration Error', 'Supabase URL is not configured. Please set CONFIG.SUPABASE_URL in app.js.');
    return;
  }

  try {
    currentProduct = JSON.parse(productJson);
  } catch (e) {
    Toast.error('Error', 'Invalid product data.');
    return;
  }

  // Populate modal
  document.getElementById('modal-product-name').textContent = currentProduct.title;
  document.getElementById('modal-product-price').textContent = `₹${currentProduct.price}`;

  // Reset form
  document.getElementById('buy-form').reset();
  const submitBtn = document.getElementById('modal-submit');
  submitBtn.disabled = false;
  document.getElementById('modal-submit-label').style.display = '';
  document.getElementById('modal-spinner').style.display = 'none';

  // Show modal
  const overlay = document.getElementById('buy-modal-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus first input
  setTimeout(() => {
    document.getElementById('customer-email').focus();
  }, 200);
}

function closeBuyModal() {
  const overlay = document.getElementById('buy-modal-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  currentProduct = null;
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('buy-modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('buy-form');

  if (closeBtn) closeBtn.addEventListener('click', closeBuyModal);
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBuyModal();
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
      closeBuyModal();
    }
  });

  // Form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentProduct) return;

      const email = document.getElementById('customer-email').value.trim();
      const name = document.getElementById('customer-name').value.trim() || 'Customer';
      const phone = document.getElementById('customer-phone').value.trim() || '';

      if (!email || !email.includes('@')) {
        Toast.error('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      const submitBtn = document.getElementById('modal-submit');
      submitBtn.disabled = true;
      document.getElementById('modal-submit-label').style.display = 'none';
      document.getElementById('modal-spinner').style.display = 'inline-block';

      try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            product_id: currentProduct.id,
            product_title: currentProduct.title,
            amount: currentProduct.price,
            pdf_file: currentProduct.pdf_file,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error (${response.status})`);
        }

        const data = await response.json();

        if (data.payu_url && data.payu_params) {
          Toast.success('Redirecting...', 'Taking you to PayU secure payment page.');
          submitPayUForm(data.payu_url, data.payu_params);
        } else {
          throw new Error('Invalid response from server.');
        }
      } catch (err) {
        console.error('Buy Now error:', err);
        Toast.error('Payment Error', err.message || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        document.getElementById('modal-submit-label').style.display = '';
        document.getElementById('modal-spinner').style.display = 'none';
      }
    });
  }
});

function submitPayUForm(actionUrl, formData) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  for (const [key, value] of Object.entries(formData)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

// ============================================================
//  HERO PARTICLES (lightweight)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const particleContainer = document.querySelector('.hero-particles');
  if (!particleContainer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    const size = Math.random() * 4 + 2;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 150}px`);
    p.style.setProperty('--dy', `${(Math.random() - 0.5) * 150}px`);
    p.style.animationDuration = `${Math.random() * 8 + 6}s`;
    p.style.animationDelay = `${Math.random() * 5}s`;
    particleContainer.appendChild(p);
  }
});
