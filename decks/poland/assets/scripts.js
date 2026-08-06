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
  const demos = `${rootPath}demos/index.html`;

  return { home, deck, docs, demos };
}

function getVersionRootHref(homeHref, fallbackRoot) {
  try {
    const homeUrl = new URL(homeHref, window.location.href);
    return new URL('.', homeUrl).href;
  } catch (err) {
    return fallbackRoot;
  }
}

function getVersionRelativeHref(versionRootHref, path) {
  try {
    return new URL(path, versionRootHref).href;
  } catch (err) {
    return path;
  }
}

function buildHeaderTags() {
  const target = document.querySelector('.card-header .tag');
  if (!target) return;

  const footerLinks = Array.from(document.querySelectorAll('.site-footer .footer-nav a'));
  const versionLink = footerLinks.find((link) => link.textContent.trim().startsWith('Version:'));
  const docsLink = footerLinks.find((link) => link.textContent.trim() === 'Google Drive');
  const defaults = getHeaderNavDefaults();
  const { parts, decksIndex, rootPath } = getHeaderNavContext();
  const deckName = decksIndex >= 0 ? parts[decksIndex + 1] : null;

  const homeHref = versionLink ? versionLink.getAttribute('href') : defaults.home;
  const versionRootHref = getVersionRootHref(homeHref, rootPath);
  const deckHref = deckName ? getVersionRelativeHref(versionRootHref, `decks/${deckName}/index.html`) : homeHref;
  const docsHref = docsLink ? docsLink.getAttribute('href') : defaults.docs;
  const demosHref = getVersionRelativeHref(versionRootHref, 'demos/index.html');

  const nav = document.createElement('nav');
  nav.className = 'tag-nav';
  nav.setAttribute('aria-label', 'Primary');

  const linkSpecs = [
    { href: homeHref, label: 'Home', icon: '🏠' },
    { href: deckHref, label: 'Top of deck', icon: '⬆️' },
    { href: docsHref, label: 'Documents', icon: '🔺' },
    { href: demosHref, label: 'Demos', icon: '🧪' }
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildHeaderTags);
} else {
  buildHeaderTags();
}


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
