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
    const duration = entry.dates.match(/\b(\d+)\s+days?\s*\/\s*\d+\s+nights?\b/i);
    entry.filterShip = entry.numeric.ship === null ? 'Unknown capacity'
      : /Coral I.*or Coral II/i.test(entry.ship) ? '20 or 36 guests (vessel unassigned)'
        : entry.numeric.ship + ' guests';
    entry.filterDuration = duration ? Number(duration[1]) + ' days' : 'Unknown duration';
    // The detailed paragraph's bold lead may contain the evidence qualification;
    // paragraphText deliberately removes that lead from the comparison cell.
    const partyParagraph = item.querySelector('.party-availability');
    const roomEvidence = partyParagraph?.dataset.roomEvidence;
    const previousQuote = /\btwo (?:queen|king|private twin) cabins? priced together\b/i
      .test(partyParagraph?.textContent || '');
    if (roomEvidence === 'listed') {
      entry.filterParty = 'Named cabins listed (not held)';
    } else if (roomEvidence === 'quoted' || previousQuote) {
      entry.filterParty = 'Two-cabin quote (not held)';
    } else {
      entry.filterParty = 'Two cabins not verified';
    }
    entry.filterPrice = SiteprepPackageTableFilters.priceBucket({
      currency: 'USD', amount: entry.numeric.price,
    });
    return entry;
  });

  const count = document.createElement('p');
  count.id = 'comparison-count';
  const initialCount = packages.length + ' packages. The initial order follows the detailed list. Sort or filter by column; open a package for sources and full costs.';
  count.textContent = initialCount;
  const toolbar = document.createElement('div');
  toolbar.className = 'comparison-controls';
  toolbar.appendChild(count);
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
  container.replaceChildren(toolbar, scroll, status);

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
    if (!rows.length) {
      const empty = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = columns.length;
      cell.className = 'comparison-empty';
      cell.textContent = 'No packages match the selected column filters.';
      empty.appendChild(cell);
      fragment.appendChild(empty);
    }
    body.replaceChildren(fragment);
  }

  let activeColumn = '';
  let direction = 'ascending';
  const initialStatus = status.textContent;
  const filters = SiteprepPackageTableFilters.mount({
    table,
    items: packages,
    resetHost: toolbar,
    onChange: refresh,
    configs: [
      { key: 'ship', label: 'Ship / guests', allLabel: 'All guest capacities',
        value: (item) => item.filterShip },
      { key: 'dates', label: 'Departure / duration', allLabel: 'All trip lengths',
        value: (item) => item.filterDuration },
      { key: 'price', label: 'Known USD / person', allLabel: 'All USD price bands',
        value: (item) => item.filterPrice,
        choices: SiteprepPackageTableFilters.priceChoices(packages,
          (item) => ({ currency: 'USD', amount: item.numeric.price })) },
      { key: 'party', label: 'Two private cabins', allLabel: 'All cabin evidence',
        value: (item) => item.filterParty },
    ],
  });

  function orderedPackages() {
    if (!activeColumn) return packages;
    const field = activeColumn;
    const multiplier = direction === 'ascending' ? 1 : -1;
    return [...packages].sort((a, b) => {
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
    });
  }

  function refresh() {
    const visible = filters.apply(orderedPackages());
    render(visible);
    count.textContent = filters.activeCount()
      ? visible.length + ' of ' + packages.length + ' packages match the selected filters.'
      : initialCount;
    if (activeColumn) {
      const title = columns.find(([key]) => key === activeColumn)[1];
      status.textContent = 'Sorted by ' + title + ', ' + direction
        + '. Unknown numeric values stay last. Detailed list order is unchanged.';
    } else {
      status.textContent = initialStatus;
    }
    if (filters.activeCount()) {
      status.textContent += ' ' + visible.length + ' of ' + packages.length + ' packages match '
        + filters.activeCount() + ' active column filter(s).';
    }
  }

  buttons.forEach((button) => button.addEventListener('click', () => {
    const field = button.dataset.sort;
    direction = activeColumn === field && direction === 'ascending' ? 'descending' : 'ascending';
    activeColumn = field;
    buttons.forEach((other) => {
      const selected = other === button;
      other.closest('th').setAttribute('aria-sort', selected ? direction : 'none');
      other.querySelector('.sort-indicator').textContent = selected
        ? (direction === 'ascending' ? '↑' : '↓') : '↕';
    });
    refresh();
  }));
  refresh();

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
