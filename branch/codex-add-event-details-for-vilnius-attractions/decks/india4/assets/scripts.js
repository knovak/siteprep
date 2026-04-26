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

