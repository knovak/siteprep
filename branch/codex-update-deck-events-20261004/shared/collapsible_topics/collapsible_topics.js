/**
 * CollapsibleTopics - collapse/expand toggles for the topics on a page.
 *
 * Every heading matched by the `headings` selector inside a topic container
 * becomes a toggle: the content that follows it, up to the next topic heading,
 * is wrapped in a generated `.topic-body` that can be hidden, leaving only the
 * title. That turns a long page into a scannable list of topic titles.
 *
 * The markup stays plain headings + content - there is nothing to author, and
 * with JavaScript off the page reads exactly as it did before. Every deck's
 * `assets/scripts.js` loads this file and auto-initializes it, so deck and
 * section pages get the behavior without any per-page wiring.
 *
 * Per-topic defaults come from the markup: `data-collapsed="true"` on a heading
 * starts that topic collapsed, `data-collapsed="false"` starts it expanded.
 *
 * See shared/collapsible_topics/collapsible_topics.md for full documentation.
 */
(function (global) {
  if (global.CollapsibleTopics) return; // already loaded

  const TOGGLE_EVENT = 'collapsible-topics:toggle';
  const READY_EVENT = 'collapsible-topics:ready';
  // Topics live inside a card's content, and maps sometimes sit in their own
  // section outside any card - both are scanned for topic headings.
  const DEFAULT_CONTAINER = '.card-content, .map-section';
  const CARD_CONTENT = '.card-content';
  const CARD_HEADER = '.card-header';
  const DEFAULT_HEADINGS = 'h2, h3';

  // Headings that belong to another control (a table-of-contents card, a legend
  // button, a gallery caption) are that widget's title, not a page topic.
  const DEFAULT_SKIP = 'a, button, summary, nav, table, .toc-grid, .map-legend, .photo-gallery';

  let sequence = 0;

  function resolveContainers(containerOption) {
    if (!containerOption) return Array.from(document.querySelectorAll(DEFAULT_CONTAINER));
    if (typeof containerOption === 'string') return Array.from(document.querySelectorAll(containerOption));
    if (containerOption instanceof Element) return [containerOption];
    return Array.from(containerOption);
  }

  function isTopicHeading(heading, container, options) {
    if (heading.classList.contains('topic-heading')) return false; // already a topic
    if (heading.getAttribute('data-collapsible') === 'off') return false;
    const skip = options.skip === null ? null : (options.skip || DEFAULT_SKIP);
    if (skip) {
      const skipped = heading.closest(skip);
      if (skipped && container.contains(skipped)) return false;
    }
    return true;
  }

  /**
   * Move the nodes that follow `heading` into a new `.topic-body`, stopping at
   * the next topic heading. A sibling that *contains* a topic heading (a
   * `.highlight` box with its own heading, say) also ends the body, so that box
   * becomes its own topic instead of being swallowed by the topic above it.
   */
  function wrapTopicBody(heading, topicHeadings) {
    const body = document.createElement('div');
    body.className = 'topic-body';

    let node = heading.nextSibling;
    while (node) {
      const nextNode = node.nextSibling;
      if (node.nodeType === Node.ELEMENT_NODE
        && topicHeadings.some((other) => other === node || node.contains(other))) {
        break;
      }
      body.appendChild(node);
      node = nextNode;
    }

    heading.insertAdjacentElement('afterend', body);
    return body;
  }

  function defaultCollapsedFor(heading, options) {
    const attr = heading.getAttribute('data-collapsed');
    if (attr !== null) return attr !== 'false';
    return Boolean(options.defaultCollapsed);
  }

  function buildToggle(heading, bodyId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'topic-toggle';
    button.setAttribute('aria-controls', bodyId);
    button.innerHTML = '<span class="topic-toggle-caret" aria-hidden="true"></span>';
    heading.insertAdjacentElement('afterbegin', button);
    return button;
  }

  /**
   * Widgets that measure their own container - Leaflet maps above all - cannot
   * lay themselves out while hidden. Leaflet re-measures on window resize, so a
   * single resize event after an expand fixes every map on the page.
   */
  function notifyLayoutChanged() {
    const fire = () => window.dispatchEvent(new Event('resize'));
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(fire);
    } else {
      fire();
    }
  }

  function enhance(heading, body, options) {
    if (heading.classList.contains('topic-heading')) return null;

    sequence += 1;
    if (!body.id) body.id = `topic-body-${sequence}`;
    body.classList.add('topic-body');

    heading.classList.add('topic-heading');
    const button = buildToggle(heading, body.id);
    const title = heading.textContent.trim();

    const topic = {
      heading,
      body,
      button,
      title,
      get expanded() {
        return button.getAttribute('aria-expanded') === 'true';
      },
      expand: (notify) => apply(true, notify !== false),
      collapse: (notify) => apply(false, notify !== false),
      toggle: () => apply(!topic.expanded, true)
    };

    function apply(expanded, notify) {
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${title}`);
      button.title = `${expanded ? 'Collapse' : 'Expand'} ${title}`;
      body.hidden = !expanded;
      heading.classList.toggle('is-collapsed', !expanded);
      if (!notify) return;
      heading.dispatchEvent(new CustomEvent(TOGGLE_EVENT, {
        bubbles: true,
        detail: { expanded, heading, body, title, topic }
      }));
      if (expanded) notifyLayoutChanged();
    }

    // The whole heading is a click target; the button's click bubbles up here.
    heading.addEventListener('click', (event) => {
      // Let links and any other controls inside the heading behave normally.
      const clickedButton = event.target.closest('button');
      if (event.target.closest('a') || (clickedButton && clickedButton !== button)) return;
      topic.toggle();
    });

    apply(!defaultCollapsedFor(heading, options), false);
    return topic;
  }

  /**
   * A card whose header is a title rather than the page title - `<div
   * class="card-header"><h2>Table of Contents</h2></div>` followed by the
   * card's `.card-content` - collapses that whole card. The content div is
   * already the body, so nothing needs wrapping.
   */
  function enhanceCardTitles(headingSelector, options) {
    const topics = [];
    document.querySelectorAll(CARD_HEADER).forEach((header) => {
      const body = header.nextElementSibling;
      if (!body || !body.matches(CARD_CONTENT)) return;
      const heading = Array.from(header.querySelectorAll(headingSelector))
        .find((candidate) => isTopicHeading(candidate, header, options));
      if (!heading) return;
      const topic = enhance(heading, body, options);
      if (topic) topics.push(topic);
    });
    return topics;
  }

  /**
   * Make the topics on a page collapsible.
   *
   * @param {object} [options]
   * @param {string|Element|Element[]} [options.container='.card-content, .map-section']
   *        Topic container(s). A selector matches every container on the page.
   * @param {string} [options.headings='h2, h3'] selector for topic headings
   * @param {string|null} [options.skip] selector for contexts whose headings are
   *        not topics; defaults to links, buttons, tables, and TOC/legend/gallery
   *        widgets. Pass `null` to treat every matched heading as a topic.
   * @param {boolean} [options.cardTitles=true] also collapse whole cards from a
   *        heading in their `.card-header`
   * @param {boolean} [options.defaultCollapsed=false] page-wide starting state
   * @returns {Array} one topic object per enhanced heading
   */
  function init(options = {}) {
    const headingSelector = options.headings || DEFAULT_HEADINGS;
    const topics = options.cardTitles === false ? [] : enhanceCardTitles(headingSelector, options);

    resolveContainers(options.container).forEach((container) => {
      const topicHeadings = Array.from(container.querySelectorAll(headingSelector))
        .filter((heading) => isTopicHeading(heading, container, options));
      topicHeadings.forEach((heading) => {
        const topic = enhance(heading, wrapTopicBody(heading, topicHeadings), options);
        if (topic) topics.push(topic);
      });
    });

    document.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { topics } }));
    return topics;
  }

  /**
   * Initialize with the page defaults once the DOM is ready. Each deck's
   * `assets/scripts.js` calls this. A page opts out with
   * `data-collapsible-topics="off"` on <html> or <body>, or takes over with
   * "manual" and calls init() itself with its own options.
   */
  function autoInit(options = {}) {
    const start = () => {
      const mode = document.documentElement.getAttribute('data-collapsible-topics')
        || (document.body && document.body.getAttribute('data-collapsible-topics'));
      if (mode === 'off' || mode === 'manual') return;
      init(Object.assign({}, global.collapsibleTopicsOptions, options));
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  global.CollapsibleTopics = { init, autoInit, TOGGLE_EVENT, READY_EVENT };
})(window);
