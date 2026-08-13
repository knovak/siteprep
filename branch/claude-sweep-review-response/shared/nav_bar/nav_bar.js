/**
 * SiteNav - the shared header navigation bar.
 *
 * Replaces the `.card-header .tag` element with a row of navigation pills. This
 * was previously a `buildHeaderTags()` function copied byte-for-byte into all
 * fifteen decks; it lives here so a change to the bar happens once.
 *
 * Opt-in, like every other shared library: a deck that wants a different bar
 * simply does not call `SiteNav.render()`.
 *
 * See shared/nav_bar/nav_bar.md.
 */
(function (global) {
  'use strict';

  var DEFAULT_DOCS_HREF =
    'https://drive.google.com/drive/folders/1BDF-8Vz_8P5PIH_78GikTFfYA_ZtOoUS?usp=drive_link';

  var DEFAULT_BUTTONS = ['home', 'top', 'documents', 'demos'];

  /**
   * Collections that own a "top of" button. The key is the path segment; the
   * label is what the button reads when the current page sits inside one.
   */
  var COLLECTIONS = {
    decks: { label: 'Top of deck', top: 'decks/{name}/index.html' },
    initiatives: { label: 'Top of initiatives', top: 'initiatives/index.html' }
  };

  function pathSegments() {
    return global.location.pathname.split('/').filter(Boolean);
  }

  /**
   * The root of *this* deployment - the site root on main, the branch
   * directory on a branch preview. Three sources, best first:
   *
   *   1. A <meta name="siteprep-version-root"> written by the build, which
   *      knows the answer exactly.
   *   2. The footer's "Version:" link, for pages built before the meta tag.
   *   3. A path guess, which is only correct for pages under decks/ and is
   *      kept solely so a page with neither of the above still renders.
   */
  function versionRoot() {
    return metaRoot() || footerRoot() || guessedRoot();
  }

  function metaRoot() {
    var meta = document.querySelector('meta[name="siteprep-version-root"]');
    if (!meta) return null;
    var content = meta.getAttribute('content');
    if (content === null) return null;
    return resolve(content === '' ? '.' : content, global.location.href);
  }

  function footerRoot() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.site-footer .footer-nav a')
    );
    var versionLink = links.find(function (link) {
      return link.textContent.trim().indexOf('Version:') === 0;
    });
    if (!versionLink) return null;
    var home = resolve(versionLink.getAttribute('href'), global.location.href);
    return home ? resolve('.', home) : null;
  }

  function guessedRoot() {
    var parts = pathSegments();
    var decksIndex = parts.indexOf('decks');
    if (decksIndex > 0) return resolve('/' + parts.slice(0, decksIndex).join('/') + '/', global.location.href);
    if (decksIndex === 0) return resolve('/', global.location.href);
    if (parts.length > 0) return resolve('/' + parts[0] + '/', global.location.href);
    return resolve('/', global.location.href);
  }

  function resolve(path, base) {
    try {
      return new URL(path, base).href;
    } catch (err) {
      return null;
    }
  }

  /**
   * Which collection the current page belongs to, and the name of the entry
   * within it - `decks/india1/...` gives { collection: 'decks', name: 'india1' }.
   */
  function currentCollection() {
    var parts = pathSegments();
    for (var key in COLLECTIONS) {
      if (!Object.prototype.hasOwnProperty.call(COLLECTIONS, key)) continue;
      var index = parts.indexOf(key);
      // A TOC page (`/decks/index.html`) has no entry after it, so it is not
      // "inside" the collection for navigation purposes.
      if (index >= 0 && parts.length > index + 2) {
        return { collection: key, name: parts[index + 1] };
      }
    }
    return null;
  }

  function docsHref() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.site-footer .footer-nav a')
    );
    var docsLink = links.find(function (link) {
      return link.textContent.trim() === 'Google Drive';
    });
    return docsLink ? docsLink.getAttribute('href') : DEFAULT_DOCS_HREF;
  }

  function buildLinkSpecs(options) {
    var root = versionRoot();
    var context = currentCollection();
    var specs = {
      home: { href: resolve('index.html', root), label: 'Home', icon: '🏠' },
      documents: { href: options.docsHref || docsHref(), label: 'Documents', icon: '🔺' },
      demos: { href: resolve('demos/index.html', root), label: 'Demos', icon: '🧪' },
      initiatives: { href: resolve('initiatives/index.html', root), label: 'Initiatives', icon: '🧭' }
    };

    // "Top of" only exists when the page is inside a collection entry. On a TOC
    // page it would duplicate Home, so it is left out.
    if (context) {
      var collection = COLLECTIONS[context.collection];
      specs.top = {
        href: resolve(collection.top.replace('{name}', context.name), root),
        label: collection.label,
        icon: '⬆️'
      };
    }

    return specs;
  }

  /**
   * Render the bar in place of the page's `.card-header .tag` element.
   *
   * @param {Object}   [options]
   * @param {string[]} [options.buttons] - which buttons, in order.
   * @param {string}   [options.current] - button id to mark as the current page.
   * @param {string}   [options.docsHref] - override the Documents link.
   * @param {string}   [options.mount] - selector for the element to replace.
   */
  function render(options) {
    options = options || {};
    var mount = document.querySelector(options.mount || '.card-header .tag');
    if (!mount) return null;

    var specs = buildLinkSpecs(options);
    var wanted = options.buttons || DEFAULT_BUTTONS;

    var nav = document.createElement('nav');
    nav.className = 'tag-nav';
    nav.setAttribute('aria-label', 'Primary');

    wanted.forEach(function (id) {
      var spec = specs[id];
      if (!spec || !spec.href) return;

      var link = document.createElement('a');
      link.className = 'tag';
      link.href = spec.href;
      link.textContent = spec.icon + ' ' + spec.label;
      if (id === options.current) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      }
      if (spec.href.indexOf('http') === 0 && !sameOrigin(spec.href)) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      nav.appendChild(link);
    });

    mount.replaceWith(nav);
    return nav;
  }

  function sameOrigin(href) {
    try {
      return new URL(href, global.location.href).origin === global.location.origin;
    } catch (err) {
      return false;
    }
  }

  global.SiteNav = {
    render: render,
    versionRoot: versionRoot,
    currentCollection: currentCollection
  };
})(window);
