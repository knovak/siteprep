/**
 * SiteFooter - the shared page footer.
 *
 * Fills the page's `<footer class="site-footer">` with the link row every page
 * carries: the version, the deck and section links when the page has them, the
 * Google Drive folder, the GitHub repository, and the version browser.
 *
 * This was previously emitted by `scripts/build.sh` as a block of escaped
 * JavaScript, rebuilt line by line into every generated page - so changing the
 * footer meant editing `footer_html="${footer_html}..."` string concatenation
 * and rebuilding to find out what it produced. The build now supplies only what
 * it alone knows (the version name and where the page sits in the tree) as data
 * attributes, and the link list lives here, next to the nav bar it mirrors.
 *
 * Unlike the other libraries in `shared/`, the footer is not opt-in: the build
 * injects it into every page it publishes. It ships no stylesheet - `.site-footer`
 * and `.footer-nav` are already styled by each deck's own `assets/styles.css`
 * and by `shared/site_base/site_base.css`, and decks own their look.
 *
 * See shared/site_footer/site_footer.md.
 */
(function (global) {
  'use strict';

  var thisScript = document.currentScript;

  var DEFAULT_DRIVE_HREF =
    'https://drive.google.com/drive/folders/1BDF-8Vz_8P5PIH_78GikTFfYA_ZtOoUS?usp=drive_link';

  var DEFAULT_GITHUB_HREF = 'https://github.com/knovak/siteprep';

  /**
   * The footer's links, in order. `root` is the relative path from this page to
   * the root of *this* deployment - "" at the root, "../../" from a section -
   * so a branch preview links within itself rather than escaping to main.
   */
  function buildLinks(options) {
    var root = options.root || '';
    var links = [
      { href: root + 'index.html', text: 'Version: ' + (options.version || 'unknown') }
    ];

    // Deck and section links exist only on pages that sit inside one.
    if (options.deckHref) links.push({ href: options.deckHref, text: 'Deck' });
    if (options.sectionHref) links.push({ href: options.sectionHref, text: 'Section' });

    links.push({
      href: options.driveHref || DEFAULT_DRIVE_HREF,
      text: 'Google Drive',
      external: true
    });
    links.push({
      href: options.githubHref || DEFAULT_GITHUB_HREF,
      text: 'GitHub',
      external: true
    });
    links.push({ href: root + 'index-versions.html', text: 'View all versions' });

    return links;
  }

  /**
   * Render the link row into a footer element.
   *
   * @param {Object} [options]
   * @param {string} [options.root] - relative path from this page to the deployment root.
   * @param {string} [options.version] - version name, shown as "Version: <name>".
   * @param {string} [options.deckHref] - link to the deck index, when there is one.
   * @param {string} [options.sectionHref] - link to the section overview, when there is one.
   * @param {string} [options.driveHref] - override the Google Drive target.
   * @param {string} [options.githubHref] - override the GitHub target.
   * @param {Element|string} [options.mount] - the footer element, or a selector for it.
   */
  function render(options) {
    options = options || {};

    var footer = resolveMount(options.mount);
    if (!footer) return null;

    // The nav bar reads this row to find the deployment root and the Documents
    // target, so rendering twice would leave it two sets of links to choose
    // between. One row per footer.
    if (footer.querySelector('.footer-nav')) return footer.querySelector('.footer-nav');

    var nav = document.createElement('div');
    nav.className = 'footer-nav';

    buildLinks(options).forEach(function (link, index) {
      if (index > 0) {
        var separator = document.createElement('span');
        separator.className = 'footer-separator';
        separator.textContent = '|';
        nav.appendChild(separator);
      }

      var anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text;
      if (link.external) {
        anchor.target = '_blank';
        anchor.rel = 'noopener';
      }
      nav.appendChild(anchor);
    });

    footer.appendChild(nav);
    return nav;
  }

  function resolveMount(mount) {
    if (mount && typeof mount !== 'string') return mount;
    if (typeof mount === 'string') return document.querySelector(mount);
    // The build puts this script inside the footer it belongs to; a page that
    // loads the library some other way gets the first footer on the page.
    if (thisScript && thisScript.parentElement) return thisScript.parentElement;
    return document.querySelector('.site-footer');
  }

  /**
   * Read the options the build wrote onto the footer element, so a page needs
   * no inline script of its own.
   */
  function optionsFrom(footer) {
    if (!footer || !footer.getAttribute) return {};
    return {
      mount: footer,
      root: footer.getAttribute('data-root') || '',
      version: footer.getAttribute('data-version') || '',
      deckHref: footer.getAttribute('data-deck') || '',
      sectionHref: footer.getAttribute('data-section') || ''
    };
  }

  /** Render into the footer this script was loaded from. */
  function autoInit() {
    var footer = resolveMount();
    if (!footer || !footer.classList || !footer.classList.contains('site-footer')) return null;
    return render(optionsFrom(footer));
  }

  global.SiteFooter = {
    render: render,
    autoInit: autoInit
  };

  autoInit();
})(window);
