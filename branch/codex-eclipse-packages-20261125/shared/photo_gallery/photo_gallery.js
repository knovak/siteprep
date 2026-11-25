/**
 * PhotoGallery - shared helper for deck/section photo galleries: a grid or
 * carousel of images that opens a full-screen, keyboard-navigable lightbox.
 *
 * This is optional. A deck can write its own gallery markup/JS instead if it
 * wants different behavior - see shared/photo_gallery/photo_gallery.md for
 * usage docs.
 */
(function (global) {
  function initCarousel(gallery, galleryItems) {
    let currentSlide = 0;

    galleryItems.forEach((item, index) => {
      item.classList.toggle('active', index === 0);
    });

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'carousel-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-btn';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.setAttribute('aria-label', 'Previous slide');

    const indicatorsDiv = document.createElement('div');
    indicatorsDiv.className = 'carousel-indicators';

    galleryItems.forEach((_, index) => {
      const indicator = document.createElement('button');
      indicator.className = 'carousel-indicator';
      indicator.classList.toggle('active', index === 0);
      indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
      indicator.addEventListener('click', () => goToSlide(index));
      indicatorsDiv.appendChild(indicator);
    });

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
  }

  /**
   * Initialize a photo gallery with lightbox functionality.
   * @param {string} galleryId - id of the gallery container element (a `.photo-gallery`, optionally `.carousel`)
   * @param {object} [options] - { mode: 'carousel' } to force carousel mode instead of reading it from the class list
   */
  function init(galleryId, options = {}) {
    const gallery = document.getElementById(galleryId);
    if (!gallery) {
      console.warn('PhotoGallery.init: gallery not found:', galleryId);
      return;
    }

    const isCarousel = options.mode === 'carousel' || gallery.classList.contains('carousel');
    const galleryItems = Array.from(gallery.querySelectorAll('.gallery-item'));
    if (galleryItems.length === 0) {
      console.warn('PhotoGallery.init: no .gallery-item elements found in', galleryId);
      return;
    }

    if (isCarousel) {
      initCarousel(gallery, galleryItems);
    }

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

    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;

      switch (e.key) {
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

  global.PhotoGallery = { init };
})(window);
