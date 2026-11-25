# Photo Gallery Library

## Overview

**PhotoGallery** is a small JavaScript + CSS helper for deck/section photo galleries: a responsive grid or a compact carousel of images, each opening into a full-screen, keyboard-navigable lightbox (arrow keys to move, Escape to close, click outside to close).

This library was extracted from the gallery/carousel/lightbox code originally written for the `dubai1` deck. It's optional - a deck can write its own gallery markup and JS instead if it wants different behavior (a masonry layout, autoplay, video support, etc.). Nothing in the build checks whether a page uses this library.

**Dependencies:** none besides the browser (no jQuery, no build step).

---

## Quick Start

```html
<link rel="stylesheet" href="../../../../shared/photo_gallery/photo_gallery.css">
<script defer src="../../../../shared/photo_gallery/photo_gallery.js"></script>
```

Grid layout:

```html
<div id="city-gallery" class="photo-gallery">
  <div class="gallery-item">
    <img src="https://example.com/photo1.jpg" alt="Description of photo 1">
    <div class="gallery-caption">Caption for photo 1</div>
  </div>
  <div class="gallery-item">
    <img src="https://example.com/photo2.jpg" alt="Description of photo 2">
    <div class="gallery-caption">Caption for photo 2</div>
  </div>
</div>

<script>
  window.addEventListener('DOMContentLoaded', () => PhotoGallery.init('city-gallery'));
</script>
```

Carousel layout - add the `carousel` class to the same markup:

```html
<div id="city-gallery" class="photo-gallery carousel">
  ...same .gallery-item markup...
</div>
```

`PhotoGallery.init('city-gallery')` reads the `carousel` class automatically; pass `{ mode: 'carousel' }` explicitly if you'd rather not rely on the class name.

Adjust the relative path to `shared/` for where the page lives (see the path table in `shared/README.md`).

---

## Markup reference

- Container: `<div id="..." class="photo-gallery">` (add `carousel` for the carousel variant).
- Each image: `<div class="gallery-item"><img src="..." alt="..."><div class="gallery-caption">...</div></div>`. The caption is optional; the lightbox falls back to the image's `alt` text if omitted.
- `PhotoGallery.init(galleryId)` must run after the DOM is ready (the example above waits for `DOMContentLoaded`, since `photo_gallery.js` is typically loaded with `defer`).

## Styling

`photo_gallery.css` defines `.photo-gallery`, `.gallery-item`, `.carousel-*`, and `.lightbox-*`. It loads before a deck's own `assets/styles.css`, so a deck can override colors, sizing, or spacing by redefining those selectors. The library's accent colors follow the `--primary`/`--accent`/`--text` custom properties a deck defines in `:root` (with built-in fallbacks), so a themed deck gets a matching gallery for free. Forking `photo_gallery.js` itself is fine if a page wants different lightbox/carousel *behavior*, not just appearance.
