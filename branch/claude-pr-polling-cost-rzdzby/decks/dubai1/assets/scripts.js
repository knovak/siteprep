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
 * Header navigation: load the shared SiteNav library for every page in this
 * deck, so the header pill row is defined in one place instead of once per
 * deck. Paths are resolved from this script's own URL, so they work at any page
 * depth and under any deployment prefix. See shared/nav_bar/nav_bar.md.
 */
(() => {
  const thisScript = document.currentScript
    || document.querySelector('script[src$="assets/scripts.js"]');
  if (!thisScript || !thisScript.src) return;

  const libraryBase = new URL('../../../shared/nav_bar/', thisScript.src);
  const startSiteNav = () => {
    if (window.SiteNav) window.SiteNav.render();
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

/**
 * Collapsible topics: load the shared CollapsibleTopics library for every page
 * in this deck, so each topic heading gets a collapse/expand toggle. Paths are
 * resolved from this script's own URL, so they work at any page depth and under
 * any deployment prefix. See shared/collapsible_topics/collapsible_topics.md.
 */
(() => {
  const thisScript = document.currentScript
    || document.querySelector('script[src$="assets/scripts.js"]');
  if (!thisScript || !thisScript.src) return;

  const libraryBase = new URL('../../../shared/collapsible_topics/', thisScript.src);
  const startCollapsibleTopics = () => {
    if (window.CollapsibleTopics) window.CollapsibleTopics.autoInit();
  };

  if (!document.querySelector('link[data-collapsible-topics]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = new URL('collapsible_topics.css', libraryBase).href;
    styles.setAttribute('data-collapsible-topics', '');
    document.head.appendChild(styles);
  }

  if (window.CollapsibleTopics) {
    startCollapsibleTopics();
    return;
  }

  const script = document.createElement('script');
  script.src = new URL('collapsible_topics.js', libraryBase).href;
  script.addEventListener('load', startCollapsibleTopics);
  script.addEventListener('error', () => {
    console.debug('Collapsible topics library failed to load', script.src);
  });
  document.head.appendChild(script);
})();
