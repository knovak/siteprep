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

/**
 * Initialize a photo gallery with lightbox functionality
 * @param {string} galleryId - The ID of the gallery container element
 */
function initPhotoGallery(galleryId) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) return;

  const galleryItems = Array.from(gallery.querySelectorAll('.gallery-item'));
  if (galleryItems.length === 0) return;

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
