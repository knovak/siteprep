/* Detailed entries are the only inventory; sorting never changes their order. */
(() => {
  const container = document.getElementById('package-comparison');
  if (!container) return;

  const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const columns = [
    ['name', 'Package / ID'],
    ['ship', 'Ship / guests'],
    ['dates', 'Departure / duration'],
    ['price', 'Known USD / person'],
    ['availability', 'General availability'],
    ['party', 'Two private cabins'],
    ['provider', 'Provider reviews'],
    ['vessel', 'Vessel reviews'],
  ];
  const sources = {
    ship: ['.package-ship', 'Vessel capacity not verified'],
    dates: ['.package-dates', 'Dates not verified'],
    price: ['.package-price', 'Comparable price not established'],
    availability: ['.package-availability', 'General availability not verified'],
    party: ['.party-availability', 'Two private cabins not confirmed'],
    provider: ['.provider-reviews', 'Provider review evidence not assessed'],
    vessel: ['.ship-reviews', 'Vessel review evidence not assessed'],
  };

  function paragraphText(paragraph, fallback) {
    const copy = paragraph?.cloneNode(true);
    const label = copy?.querySelector(':scope > strong');
    if (label && /:\s*$/.test(label.textContent)) label.remove();
    return normalize(copy?.textContent) || fallback;
  }

  function numericAttribute(element, name) {
    const value = element?.getAttribute(name)?.trim();
    return value && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null;
  }

  function startDate(element) {
    const value = element?.getAttribute('data-start');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(value)
      ? timestamp : null;
  }

  const packages = Array.from(document.querySelectorAll('.package-list > li[id^="package-"]'), (item, index) => {
    const label = item.querySelector(':scope > strong')?.cloneNode(true);
    const itemId = normalize(label?.querySelector('.item-id')?.textContent);
    label?.querySelector('.item-id')?.remove();
    const entry = {
      id: item.id,
      itemId,
      name: normalize(label?.textContent).replace(/:\s*$/, ''),
      index,
    };
    Object.entries(sources).forEach(([field, [selector, fallback]]) => {
      entry[field] = paragraphText(item.querySelector(selector), fallback);
    });
    entry.numeric = {
      ship: numericAttribute(item.querySelector('.package-ship'), 'data-pax'),
      dates: startDate(item.querySelector('.package-dates')),
      price: numericAttribute(item.querySelector('.package-price'), 'data-usd'),
    };
    return entry;
  });

  const count = document.createElement('p');
  count.id = 'comparison-count';
  count.textContent = `${packages.length} packages. The initial order follows the detailed list. Sort by any column; open a package for sources and full costs.`;
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll comparison-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Galápagos package comparison; scroll horizontally for all columns');
  const table = document.createElement('table');
  table.className = 'comparison-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Galápagos departures for four adults in two private cabins';
  table.appendChild(caption);
  const header = table.createTHead().insertRow();
  const buttons = columns.map(([field, title]) => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.setAttribute('aria-sort', 'none');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sort = field;
    button.appendChild(document.createTextNode(`${title} `));
    const indicator = document.createElement('span');
    indicator.className = 'sort-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.textContent = '↕';
    button.appendChild(indicator);
    cell.appendChild(button);
    header.appendChild(cell);
    return button;
  });
  const body = table.createTBody();
  body.id = 'package-comparison-rows';
  const status = document.createElement('p');
  status.id = 'comparison-sort-status';
  status.className = 'comparison-status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Original list order. Price sorting uses only the stated USD per-person subtotal; unknown values stay last.';
  scroll.appendChild(table);
  container.replaceChildren(count, scroll, status);

  function render(rows) {
    const fragment = document.createDocumentFragment();
    rows.forEach((item) => {
      const row = document.createElement('tr');
      row.dataset.packageId = item.id;
      columns.forEach(([field]) => {
        const cell = document.createElement(field === 'name' ? 'th' : 'td');
        cell.className = `comparison-${field}`;
        if (field === 'name') {
          cell.scope = 'row';
          const link = document.createElement('a');
          link.href = `#${item.id}`;
          link.textContent = item.name;
          const number = document.createElement('span');
          number.className = 'item-id';
          number.textContent = ` ${item.itemId}`;
          link.appendChild(number);
          cell.appendChild(link);
        } else {
          cell.textContent = item[field];
        }
        row.appendChild(cell);
      });
      fragment.appendChild(row);
    });
    body.replaceChildren(fragment);
  }

  render(packages);
  let activeColumn = '';
  let direction = 'ascending';
  buttons.forEach((button) => button.addEventListener('click', () => {
    const field = button.dataset.sort;
    direction = activeColumn === field && direction === 'ascending' ? 'descending' : 'ascending';
    activeColumn = field;
    const multiplier = direction === 'ascending' ? 1 : -1;
    render([...packages].sort((a, b) => {
      let result;
      if (Object.hasOwn(a.numeric, field)) {
        const left = a.numeric[field], right = b.numeric[field];
        // Unknown never means zero, including in descending order.
        if (left === null || right === null) {
          return left === right ? a.index - b.index : left === null ? 1 : -1;
        }
        result = left - right;
      } else {
        result = collator.compare(a[field], b[field]);
      }
      return result * multiplier || a.index - b.index;
    }));
    buttons.forEach((other) => {
      const selected = other === button;
      other.closest('th').setAttribute('aria-sort', selected ? direction : 'none');
      other.querySelector('.sort-indicator').textContent = selected
        ? (direction === 'ascending' ? '↑' : '↓') : '↕';
    });
    const title = columns.find(([key]) => key === field)[1];
    status.textContent = `Sorted by ${title}, ${direction}. Unknown numeric values stay last. Detailed list order is unchanged.`;
  }));

  // Links still reach evidence when readers have collapsed the containing topic.
  function revealTarget(hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor.matches('.topic-body[hidden]')) {
        ancestor.previousElementSibling?.querySelector('.topic-toggle')?.click();
      }
      ancestor = ancestor.parentElement;
    }
    if (target.nextElementSibling?.matches('.topic-body[hidden]')) {
      target.querySelector('.topic-toggle')?.click();
    }
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealTarget(link.hash);
  });
  const revealHash = () => {
    if (!location.hash) return;
    revealTarget(location.hash);
  };
  window.addEventListener('hashchange', revealHash);
  document.addEventListener('collapsible-topics:ready', revealHash);
  revealHash();
})();
