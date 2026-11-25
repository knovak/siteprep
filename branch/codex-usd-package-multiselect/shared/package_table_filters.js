/* Shared checkbox filters for the package comparison tables. */
(() => {
  'use strict';

  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  // ECB reference rates, 24 November 2026, quoted in units per euro.
  const unitsPerEuro = { EUR: 1, USD: 1.0963, GBP: 0.83700, AUD: 1.6507 };
  const rateSource = 'https://data-api.ecb.europa.eu/service/data/EXR/D.USD+GBP+AUD.EUR.SP00.A?startPeriod=2026-11-24&endPeriod=2026-11-24';
  const bands = [
    { value: 'under', label: 'Under US$5,000' },
    { value: 'middle', label: 'US$5,000–US$10,000' },
    { value: 'over', label: 'Over US$10,000' },
    { value: 'unknown', label: 'Unknown / no comparable fare' },
  ];

  function toUsd(amount, currency) {
    if (!Number.isFinite(amount) || !Object.hasOwn(unitsPerEuro, currency)) return null;
    return currency === 'USD' ? amount : amount * unitsPerEuro.USD / unitsPerEuro[currency];
  }

  function priceFilter(key, label, getUsd) {
    return {
      key, label, allLabel: 'All USD prices', choices: bands, showRates: true,
      value(item) {
        const usd = getUsd(item);
        if (!Number.isFinite(usd)) return 'unknown';
        return usd < 5000 ? 'under' : usd <= 10000 ? 'middle' : 'over';
      },
    };
  }

  function positionMenu(trigger, menu) {
    const gap = 4;
    const anchor = trigger.getBoundingClientRect();
    const viewport = document.documentElement;
    const below = viewport.clientHeight - anchor.bottom - gap;
    const above = anchor.top - gap;
    const top = below >= menu.offsetHeight || below >= above
      ? anchor.bottom + gap : anchor.top - menu.offsetHeight - gap;
    menu.style.top = Math.max(gap, Math.min(top, viewport.clientHeight - menu.offsetHeight - gap)) + 'px';
    menu.style.left = Math.max(gap, Math.min(anchor.left, viewport.clientWidth - menu.offsetWidth - gap)) + 'px';
  }

  function mount({ table, items, configs, resetHost, onChange }) {
    const sortButtons = Array.from(table.querySelectorAll('thead button[data-sort]'));
    const controls = configs.map((config) => {
      const sortButton = sortButtons.find((button) => button.dataset.sort === config.key);
      if (!sortButton) throw new Error('No table column for filter ' + config.key);

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'comparison-filter';
      trigger.dataset.filter = config.key;

      const menu = document.createElement('div');
      menu.id = 'package-filter-' + (table.id || table.tBodies[0].id) + '-' + config.key;
      menu.className = 'comparison-filter-menu';
      menu.popover = 'auto';
      menu.setAttribute('role', 'group');
      menu.setAttribute('aria-label', config.label);
      trigger.setAttribute('popovertarget', menu.id);
      sortButton.closest('th').append(trigger, menu);

      const reposition = () => positionMenu(trigger, menu);
      menu.addEventListener('toggle', () => {
        if (menu.matches(':popover-open')) {
          reposition();
          window.addEventListener('scroll', reposition, true);
          window.addEventListener('resize', reposition);
        } else {
          window.removeEventListener('scroll', reposition, true);
          window.removeEventListener('resize', reposition);
        }
      });

      const present = new Set(items.map((item) => String(config.value(item))));
      const choices = config.choices || Array.from(present).sort(collator.compare)
        .map((value) => ({ value, label: value }));
      const selected = new Set();
      const checkboxes = [];
      for (const choice of choices.filter((option) => present.has(option.value))) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = choice.value;
        label.append(input, choice.label);
        menu.appendChild(label);
        checkboxes.push(input);
        input.addEventListener('change', () => {
          if (input.checked) selected.add(input.value);
          else selected.delete(input.value);
          updateLabel();
          refresh();
          reposition();
        });
      }

      if (config.showRates) {
        const note = document.createElement('small');
        const link = document.createElement('a');
        link.href = rateSource;
        link.textContent = 'ECB rates, Nov 24, 2026';
        note.append('Foreign fares use ', link, '.');
        menu.appendChild(note);
      }

      function updateLabel() {
        const first = checkboxes.find((input) => input.checked);
        const summary = selected.size > 1 ? selected.size + ' selected'
          : first ? first.parentElement.textContent : config.allLabel || 'All values';
        trigger.textContent = summary;
        trigger.setAttribute('aria-label', 'Filter ' + config.label + ', ' + summary);
      }
      updateLabel();
      return {
        selected, value: config.value,
        reset() {
          selected.clear();
          checkboxes.forEach((input) => { input.checked = false; });
          updateLabel();
        },
      };
    });

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'comparison-clear';
    clear.dataset.clearFilters = '';
    clear.textContent = 'Clear filters';
    clear.setAttribute('aria-label', 'Clear all column filters');
    clear.disabled = true;
    resetHost.appendChild(clear);

    const activeCount = () => controls.filter(({ selected }) => selected.size).length;
    function refresh() {
      clear.disabled = activeCount() === 0;
      onChange();
    }
    clear.addEventListener('click', () => {
      controls.forEach((control) => control.reset());
      refresh();
    });

    return {
      activeCount,
      apply(rows) {
        return rows.filter((item) => controls.every(({ selected, value }) =>
          selected.size === 0 || selected.has(String(value(item)))));
      },
    };
  }

  window.SiteprepPackageTableFilters = { mount, priceFilter, toUsd };
})();
