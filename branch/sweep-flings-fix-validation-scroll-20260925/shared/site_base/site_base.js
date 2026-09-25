/**
 * Site-level page script, for the generated TOC pages (the root deck index, the
 * demos index, and the version browser).
 *
 * These pages used to load whichever deck sorted first alphabetically, which
 * meant renaming a deck could change how they looked and behaved. They load
 * this instead, so they depend on no deck at all.
 *
 * Two jobs: register the service worker, and render the shared nav bar. The
 * nav bar's "current" button is read from this script tag's
 * `data-nav-current` attribute.
 *
 * See shared/site_base/site_base.md.
 */
(() => {
  const thisScript = document.currentScript
    || document.querySelector('script[src$="site_base.js"]');

  /* Service worker, scoped to this deployment's root so branch previews
     register their own rather than the one on main. */
  (() => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const parts = window.location.pathname.split('/').filter(Boolean);
      // A TOC page sits at the deployment root, so every path segment except
      // the file name is part of that root.
      const rootPath = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}/` : '/';
      navigator.serviceWorker.register(`${rootPath}sw.js`).catch((err) => {
        console.debug('Service worker registration failed', err);
      });
    } catch (err) {
      console.debug('Service worker registration skipped', err);
    }
  })();

  /* Shared nav bar. */
  if (!thisScript || !thisScript.src) return;

  const libraryBase = new URL('../nav_bar/', thisScript.src);
  const current = thisScript.getAttribute('data-nav-current') || undefined;
  const startSiteNav = () => {
    if (window.SiteNav) window.SiteNav.render({ current });
  };

  if (!document.querySelector('link[data-nav-bar]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = new URL('nav_bar.css', libraryBase).href;
    styles.setAttribute('data-nav-bar', '');
    document.head.appendChild(styles);
  }

  if (window.SiteNav) {
    startSiteNav();
    return;
  }

  const script = document.createElement('script');
  script.src = new URL('nav_bar.js', libraryBase).href;
  script.addEventListener('load', startSiteNav);
  script.addEventListener('error', () => {
    console.debug('Nav bar library failed to load', script.src);
  });
  document.head.appendChild(script);
})();
