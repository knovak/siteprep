(() => {
  if (!('serviceWorker' in navigator)) return;
  try {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const decksIndex = parts.indexOf('decks');
    let rootPath = '/';

    if (parts.length > 0 && parts[0] !== 'decks') {
      rootPath = `/${parts[0]}/`;
    }

    if (decksIndex > 0) {
      rootPath = `/${parts.slice(0, decksIndex).join('/')}/`;
    } else if (decksIndex === 0) {
      rootPath = '/';
    }

    const swUrl = `${rootPath}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.debug('Service worker registration failed', err);
    });
  } catch (err) {
    console.debug('Service worker registration skipped', err);
  }
})();

function buildBreadcrumb(containerId, links) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(links)) return;
  const nav = document.createElement('nav');
  nav.className = 'nav';
  links.forEach(({ href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    nav.appendChild(a);
  });
  container.replaceChildren(nav);
}


function getHeaderNavContext() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const decksIndex = parts.indexOf('decks');
  let rootPath = '/';

  if (parts.length > 0 && parts[0] !== 'decks') {
    rootPath = `/${parts[0]}/`;
  }

  if (decksIndex > 0) {
    rootPath = `/${parts.slice(0, decksIndex).join('/')}/`;
  } else if (decksIndex === 0) {
    rootPath = '/';
  }

  return { parts, decksIndex, rootPath };
}

function getHeaderNavDefaults() {
  const { parts, decksIndex, rootPath } = getHeaderNavContext();
  const deckName = decksIndex >= 0 ? parts[decksIndex + 1] : null;
  const home = `${rootPath}index.html`;
  const deck = deckName ? `${rootPath}decks/${deckName}/index.html` : home;
  const docs = 'https://drive.google.com/drive/folders/1BDF-8Vz_8P5PIH_78GikTFfYA_ZtOoUS?usp=drive_link';

  return { home, deck, docs };
}

function buildHeaderTags() {
  const target = document.querySelector('.card-header .tag');
  if (!target) return;

  const footerLinks = Array.from(document.querySelectorAll('.site-footer .footer-nav a'));
  const versionLink = footerLinks.find((link) => link.textContent.trim().startsWith('Version:'));
  const deckLink = footerLinks.find((link) => link.textContent.trim() === 'Deck');
  const docsLink = footerLinks.find((link) => link.textContent.trim() === 'Google Drive');
  const defaults = getHeaderNavDefaults();

  const homeHref = versionLink ? versionLink.getAttribute('href') : defaults.home;
  const deckHref = deckLink ? deckLink.getAttribute('href') : defaults.deck;
  const docsHref = docsLink ? docsLink.getAttribute('href') : defaults.docs;

  const nav = document.createElement('nav');
  nav.className = 'tag-nav';
  nav.setAttribute('aria-label', 'Primary');

  const linkSpecs = [
    { href: homeHref, label: 'Home', icon: '🏠' },
    { href: deckHref, label: 'Top of deck', icon: '⬆️' },
    { href: docsHref, label: 'Documents', icon: '🔺' }
  ];

  linkSpecs.forEach(({ href, label, icon }) => {
    if (!href) return;
    const link = document.createElement('a');
    link.className = 'tag';
    link.href = href;
    link.textContent = `${icon} ${label}`;
    if (href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    nav.appendChild(link);
  });

  target.replaceWith(nav);
}

buildHeaderTags();


/**
 * Initialize a photo gallery with lightbox functionality
 * @param {string} galleryId - The ID of the gallery container element
 * @param {object} options - Configuration options (e.g., { mode: 'carousel' })
 */
function initPhotoGallery(galleryId, options = {}) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) {
    console.warn('Photo gallery not found:', galleryId);
    return;
  }

  const isCarousel = options.mode === 'carousel' || gallery.classList.contains('carousel');
  const galleryItems = Array.from(gallery.querySelectorAll('.gallery-item'));
  if (galleryItems.length === 0) {
    console.warn('No gallery items found in:', galleryId);
    return;
  }

  console.log('Initializing gallery:', galleryId, 'Carousel mode:', isCarousel, 'Items:', galleryItems.length);

  // Initialize carousel mode if specified
  if (isCarousel) {
    initCarousel(gallery, galleryItems);
  }

  // Create lightbox element
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
    <button class="lightbox-nav prev" aria-label="Previous image">&#8249;</button>
    <button class="lightbox-nav next" aria-label="Next image">&#8250;</button>
    <div class="lightbox-content">
      <img class="lightbox-image" src="" alt="">
      <div class="lightbox-caption"></div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector('.lightbox-image');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-nav.prev');
  const nextBtn = lightbox.querySelector('.lightbox-nav.next');

  let currentIndex = 0;

  function showImage(index) {
    if (index < 0 || index >= galleryItems.length) return;
    currentIndex = index;
    const item = galleryItems[index];
    const img = item.querySelector('img');
    const caption = item.querySelector('.gallery-caption');

    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = caption ? caption.textContent : img.alt;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showNext() {
    showImage((currentIndex + 1) % galleryItems.length);
  }

  function showPrev() {
    showImage((currentIndex - 1 + galleryItems.length) % galleryItems.length);
  }

  // Add click handlers to gallery items
  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => showImage(index));
    item.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showImage(index);
      }
    });
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
  });

  // Lightbox controls
  closeBtn.addEventListener('click', closeLightbox);
  nextBtn.addEventListener('click', showNext);
  prevBtn.addEventListener('click', showPrev);

  // Close on background click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;

    switch(e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowRight':
        showNext();
        break;
      case 'ArrowLeft':
        showPrev();
        break;
    }
  });
}

/**
 * Initialize carousel functionality for a photo gallery
 * @param {HTMLElement} gallery - The gallery container element
 * @param {Array} galleryItems - Array of gallery item elements
 */
function initCarousel(gallery, galleryItems) {
  console.log('Initializing carousel with', galleryItems.length, 'items');
  let currentSlide = 0;

  // Show only the first item initially
  galleryItems.forEach((item, index) => {
    item.classList.toggle('active', index === 0);
    console.log('Item', index, 'active:', index === 0);
  });

  // Create controls container
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'carousel-controls';
  console.log('Creating carousel controls');

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-btn';
  prevBtn.innerHTML = '&#8249;';
  prevBtn.setAttribute('aria-label', 'Previous slide');

  // Indicators container
  const indicatorsDiv = document.createElement('div');
  indicatorsDiv.className = 'carousel-indicators';

  // Create indicator dots
  galleryItems.forEach((_, index) => {
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator';
    indicator.classList.toggle('active', index === 0);
    indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
    indicator.addEventListener('click', () => goToSlide(index));
    indicatorsDiv.appendChild(indicator);
  });

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-btn';
  nextBtn.innerHTML = '&#8250;';
  nextBtn.setAttribute('aria-label', 'Next slide');

  controlsDiv.appendChild(prevBtn);
  controlsDiv.appendChild(indicatorsDiv);
  controlsDiv.appendChild(nextBtn);
  gallery.appendChild(controlsDiv);

  function goToSlide(index) {
    galleryItems[currentSlide].classList.remove('active');
    indicatorsDiv.children[currentSlide].classList.remove('active');

    currentSlide = index;

    galleryItems[currentSlide].classList.add('active');
    indicatorsDiv.children[currentSlide].classList.add('active');
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % galleryItems.length);
  }

  function prevSlide() {
    goToSlide((currentSlide - 1 + galleryItems.length) % galleryItems.length);
  }

  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  // Auto-advance (optional, commented out by default)
  // setInterval(nextSlide, 5000);
}
