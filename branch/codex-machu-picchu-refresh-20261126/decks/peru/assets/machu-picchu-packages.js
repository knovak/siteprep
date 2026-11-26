(() => {
  'use strict';

  function enableComparison() {
    const table = document.getElementById('package-comparison');
    const controls = document.getElementById('package-controls');
    const count = document.getElementById('package-count');
    const body = table?.tBodies[0];
    if (!body || !controls || !count) return;

    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    const monthFormat = new Intl.DateTimeFormat('en', {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    });
    const items = Array.from(body.rows);
    const buttons = Array.from(table.querySelectorAll('thead button[data-sort]'));
    const labels = new Map();
    buttons.forEach((button) => {
      const indicator = button.querySelector('.sort-indicator') || document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.textContent = '';
      labels.set(button.dataset.sort, button.textContent.trim());
      button.appendChild(indicator);
    });
    const noMatches = document.createElement('tr');
    const message = noMatches.insertCell();
    message.colSpan = buttons.length;
    message.className = 'comparison-empty';
    message.textContent = 'No departures match these filters. Clear a filter to see more dates.';

    function numeric(value) {
      if (!value?.trim()) return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    const month = (row) => row.dataset.start?.slice(0, 7) || '';
    const months = Array.from(new Set(items.map(month))).filter(Boolean).sort();
    const shared = window.SiteprepPackageTableFilters;
    const filters = shared?.mount({
      table, items, resetHost: controls, onChange: refresh,
      configs: [
        { key: 'style', label: 'travel style', allLabel: 'All styles', value: (row) => row.dataset.style },
        { key: 'start', label: 'departure month', allLabel: 'All months', value: month,
          choices: months.map((value) => ({
            value, label: monthFormat.format(new Date(value + '-01T00:00:00Z')),
          })) },
        { key: 'days', label: 'duration', allLabel: 'All lengths', value: (row) => row.dataset.days + ' days' },
        shared.priceFilter('amount', 'fare per adult', (row) =>
          shared.toUsd(numeric(row.dataset.amount), row.dataset.currency)),
        { key: 'general', label: 'departure availability', allLabel: 'All availability', value: (row) => row.dataset.general },
        { key: 'party', label: 'room evidence for two couples', allLabel: 'All room evidence',
          value: (row) => row.dataset.party,
          explanations: {
            'Four priced · rooms unconfirmed': 'The booking form quoted a total for four travelers. The two private bedrooms still need confirmation.',
            'Four on calendar · rooms unconfirmed': 'The calendar showed this date and per-person fare for four adults. Room assignments and a group quote are still open.',
            'Four selected · rooms unconfirmed': 'The form accepted four adults on this departure. It did not show a combined price or bedroom assignments.',
            'Two twin rooms priced together': 'The dated checkout priced two twin rooms in one order for four adults and advanced to passenger details. No booking was made.',
            'Two doubles priced together': 'One order priced two private bedrooms for four adults, with one bed for each couple.',
            'Double + twin priced together': 'One order priced a private one-bed room for one couple and a private two-bed room for the other.',
            'Two rooms on request': 'The form calculated a total for the selected rooms and referred the party to the operator for availability.',
            'King plus shared room on request': 'Booking the king for two requires contacting the host. The host also needs to confirm exclusive use of a second bedroom.',
            'Pairs priced in two-person rooms': 'The seller priced four people in two-person double/twin accommodation and says companions are paired. Bed type and names of the pairs were not assigned.',
            'One cabin priced for two': 'The cruise checkout priced one double cabin for two adults. The second cabin and rooms on land still need confirmation.',
            'One king room listed': 'One private king room was listed. A second private bedroom for the other couple still needs confirmation.',
            'Rooms unconfirmed': 'The evidence leaves open whether each couple can have a private bedroom throughout the itinerary.',
            'Two rooms selected · unconfirmed': 'The form accepted two rooms for two adults each. The operator still needs to confirm the price and room allocation.',
          } },
      ],
    });

    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'comparison-restore';
    restore.textContent = 'Restore original order';
    controls.appendChild(restore);
    count.setAttribute('role', 'status');

    let column = '';
    let ascending = true;

    function compareRows(left, right) {
      let result;
      if (column === 'days' || column === 'amount') {
        const a = numeric(left.dataset[column]);
        const b = numeric(right.dataset[column]);
        if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
        if (column === 'amount' && left.dataset.currency !== right.dataset.currency) {
          return collator.compare(left.dataset.currency || '', right.dataset.currency || '');
        }
        result = a - b;
      } else {
        result = collator.compare(left.dataset[column] || '', right.dataset[column] || '');
      }
      return ascending ? result : -result;
    }

    function refresh() {
      const visible = filters ? filters.apply(items) : items.slice();
      if (column) visible.sort(compareRows);
      const rows = document.createDocumentFragment();
      visible.forEach((row) => rows.appendChild(row));
      if (!visible.length) rows.appendChild(noMatches);
      body.replaceChildren(rows);

      const departures = visible.length === 1 ? 'departure' : 'departures';
      const filtered = filters?.activeCount() > 0;
      const total = filtered ? visible.length + ' of ' + items.length : String(visible.length);
      let status = total + ' ' + (filtered ? 'departures' : departures);
      if (column) status += ' · ' + labels.get(column) + ', ' + (ascending ? 'ascending' : 'descending');
      count.textContent = status;
      restore.disabled = !column;
      buttons.forEach((button) => {
        const heading = button.closest('th');
        const selected = column === button.dataset.sort;
        if (selected) heading.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
        else heading.removeAttribute('aria-sort');
        button.querySelector('.sort-indicator').textContent = selected ? (ascending ? '↑' : '↓') : '↕';
      });
    }

    restore.addEventListener('click', () => {
      column = '';
      refresh();
    });
    buttons.forEach((button) => button.addEventListener('click', () => {
      ascending = button.dataset.sort !== column || !ascending;
      column = button.dataset.sort;
      refresh();
    }));
    refresh();
  }

  function renderMaps() {
    const data = document.getElementById('package-map-data');
    if (!data || !window.StandardMap || !window.L) return;
    const locations = JSON.parse(data.textContent);
    if (!locations.length) return;
    for (const layer of ['osm', 'topo']) {
      const mapId = 'package-map-' + layer;
      const legendId = 'package-legend-' + layer;
      const element = document.getElementById(mapId);
      if (!element) continue;
      const render = () => window.StandardMap.render({
        locations, [layer + 'MapId']: mapId, [layer + 'LegendId']: legendId,
      });
      if (element.clientWidth && element.clientHeight) {
        render();
      } else if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
          if (element.clientWidth && element.clientHeight) {
            observer.disconnect();
            render();
          }
        });
        observer.observe(element);
      }
    }
  }

  // An evidence link should reveal its heading even after a reader collapses that topic.
  function reveal(hash) {
    if (!hash || hash === '#') return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    for (let el = target; el; el = el.parentElement) {
      if (el.matches('details')) el.open = true;
      if (el.matches('.topic-body[hidden]')) el.previousElementSibling?.querySelector('.topic-toggle')?.click();
    }
    if (target.nextElementSibling?.matches('.topic-body[hidden]')) target.querySelector('.topic-toggle')?.click();
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash);
  });
  const revealHash = () => reveal(window.location.hash);
  window.addEventListener('hashchange', revealHash);
  document.addEventListener('collapsible-topics:ready', revealHash);
  enableComparison();
  if (document.readyState === 'complete') renderMaps();
  else document.addEventListener('DOMContentLoaded', renderMaps, { once: true });
  revealHash();
})();
