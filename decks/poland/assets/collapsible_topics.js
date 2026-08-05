/**
 * CollapsibleTopics - experimental collapse/expand toggles for page topics.
 *
 * This is a Poland-deck experiment (currently used only by the Warsaw page).
 * It progressively enhances ordinary topic markup: every heading matched by the
 * `headings` selector becomes a toggle, and everything between that heading and
 * the next matched heading is wrapped in a `.topic-body` that can be hidden.
 *
 * Because the markup stays plain headings + content, a page opts in by loading
 * this file plus `collapsible_topics.css` and calling `CollapsibleTopics.init()`;
 * with JavaScript off, the page reads exactly as it did before.
 *
 * Per-topic defaults come from the markup: add `data-collapsed="true"` (or
 * `data-collapsed="false"`) to a heading to override the page-wide default.
 *
 * See shared/poland-warsaw-collapsible-topics-techdoc.md for full docs.
 */
(function (global) {
  const TOGGLE_EVENT = 'collapsible-topics:toggle';
  const DEFAULT_HEADINGS = 'h2, h3';
  let sequence = 0;

  /**
   * Move every node that follows `heading` into a new `.topic-body` wrapper,
   * stopping at the next topic heading. A container element that *holds* a
   * topic heading (for example a `.highlight` box wrapping its own `h2`) also
   * ends the body, so that box becomes its own topic instead of being swallowed
   * into the preceding one.
   */
  function wrapTopicBody(heading, headingSelector) {
    const body = document.createElement('div');
    body.className = 'topic-body';

    let node = heading.nextSibling;
    while (node) {
      const nextNode = node.nextSibling;
      if (node.nodeType === Node.ELEMENT_NODE
        && (node.matches(headingSelector) || node.querySelector(headingSelector))) {
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

  function enhance(heading, headingSelector, options) {
    if (heading.classList.contains('topic-heading')) return null;

    const body = wrapTopicBody(heading, headingSelector);
    sequence += 1;
    body.id = body.id || `topic-body-${sequence}`;

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
      if (notify) {
        heading.dispatchEvent(new CustomEvent(TOGGLE_EVENT, {
          bubbles: true,
          detail: { expanded, heading, body, title, topic }
        }));
      }
    }

    // The whole heading is a click target; the button click bubbles up to here.
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
   * Make the topics inside a container collapsible.
   *
   * @param {object} [options]
   * @param {string|Element} [options.container='.card-content'] - topic container
   * @param {string} [options.headings='h2, h3'] - selector for topic headings
   * @param {boolean} [options.defaultCollapsed=false] - page-wide default state
   * @returns {Array} one topic object per enhanced heading
   */
  function init(options = {}) {
    const containerOption = options.container || '.card-content';
    const container = typeof containerOption === 'string'
      ? document.querySelector(containerOption)
      : containerOption;
    if (!container) return [];

    const headingSelector = options.headings || DEFAULT_HEADINGS;
    return Array.from(container.querySelectorAll(headingSelector))
      .map((heading) => enhance(heading, headingSelector, options))
      .filter(Boolean);
  }

  global.CollapsibleTopics = { init, TOGGLE_EVENT };
})(window);
