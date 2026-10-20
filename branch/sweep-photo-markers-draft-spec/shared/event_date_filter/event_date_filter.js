/** Optional event-date controls. See event_date_filter.md for markup and API. */
(function (global) {
  if (global.EventDateFilter) return;

  const MODES = [
    ['future', 'Today and future'],
    ['today', 'Today only'],
    ['all', 'All dates']
  ];
  const filters = new Map();
  let midnightTimer;

  // Calendar strings sort chronologically. Never parse ISO dates as UTC instants.
  function localDate(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')].join('-');
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
  }

  function dateRanges(value) {
    if (!value || !value.trim()) return null;
    const ranges = value.split(',').map((part) => {
      const dates = part.trim().split('/').map((date) => date.trim());
      const [start, end = start] = dates;
      if (dates.length > 2 || !validDate(start) || !validDate(end) || end < start) return null;
      return { start, end };
    });
    // An incomplete or malformed schedule must never silently lose an event.
    return ranges.every(Boolean) ? ranges : null;
  }

  function enhance(heading, list) {
    const items = Array.from(list.children).filter((item) => item.matches('li'))
      .map((item) => ({ item, initiallyHidden: item.hidden }));
    const title = document.createElement('span');
    title.className = 'event-date-filter-title';
    Array.from(heading.childNodes).forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE || !node.matches('.topic-toggle')) title.appendChild(node);
    });
    heading.appendChild(title);
    heading.classList.add('event-date-filter-heading');
    list.classList.add('event-date-filter-list');

    const controls = document.createElement('span');
    controls.className = 'event-date-filter';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Event dates');
    controls.setAttribute('data-topic-control', '');
    // Also works with older CollapsibleTopics versions and standalone headings.
    controls.addEventListener('click', (event) => event.stopPropagation());
    const buttons = MODES.map(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-controls', list.id);
      button.addEventListener('click', () => {
        mode = value;
        apply();
      });
      controls.appendChild(button);
      return { button, value };
    });
    heading.appendChild(controls);

    const empty = document.createElement('p');
    empty.className = 'event-date-filter-empty';
    empty.setAttribute('role', 'status');
    empty.hidden = true;
    list.insertAdjacentElement('afterend', empty);
    let mode = 'future';

    function apply() {
      const today = localDate(new Date());
      let visible = 0;
      items.forEach(({ item, initiallyHidden }) => {
        const ranges = dateRanges(item.getAttribute('data-event-dates'));
        const matches = mode === 'all' || !ranges || ranges.some(({ start, end }) =>
          mode === 'today' ? start <= today && today <= end : end >= today);
        item.hidden = initiallyHidden || !matches;
        if (!item.hidden) visible += 1;
      });
      buttons.forEach(({ button, value }) => button.setAttribute('aria-pressed', String(value === mode)));
      empty.textContent = mode === 'today' ? 'No events today.'
        : mode === 'future' ? 'No events today or in the future.' : 'No events listed.';
      empty.hidden = visible > 0;
    }

    apply();
    return { heading, list, refresh: apply };
  }

  function refresh() {
    filters.forEach((filter) => filter.refresh());
    global.clearTimeout(midnightTimer);
    if (!filters.size) return;
    const now = new Date();
    // Construct tomorrow in local time so DST days can be 23 or 25 hours long.
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    midnightTimer = global.setTimeout(refresh, tomorrow.getTime() - now.getTime() + 100);
  }

  function init() {
    document.querySelectorAll('h2[data-event-filter], h3[data-event-filter]').forEach((heading) => {
      if (filters.has(heading)) return;
      const list = document.getElementById(heading.getAttribute('data-event-filter'));
      if (!list || !list.matches('ul, ol')) return;
      filters.set(heading, enhance(heading, list));
    });
    refresh();
    return Array.from(filters.values());
  }

  global.EventDateFilter = { init, refresh };
  global.addEventListener('focus', refresh);
  global.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
