/* Column filters are a second, independent view over source-derived package records. */
(() => {
  'use strict';

  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const bands = [
    { value: 'under', label: '< 5,000' },
    { value: 'middle', label: '5,000–10,000' },
    { value: 'over', label: '> 10,000' },
  ];
  const currencyLabels = { USD: 'US$', EUR: '€', GBP: '£' };

  function priceBand(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'unknown';
    return amount < 5000 ? 'under' : amount <= 10000 ? 'middle' : 'over';
  }

  function priceBucket(fare) {
    const band = priceBand(fare && fare.amount);
    return fare && fare.currency && band !== 'unknown' ? fare.currency + ':' + band : 'unknown';
  }

  // A price option never combines currencies or makes an unstated FX conversion.
  function priceChoices(items, getFare) {
    const seen = new Set(items.map((item) => priceBucket(getFare(item))));
    const currencies = Array.from(new Set(items.map((item) => getFare(item).currency).filter(Boolean)))
      .sort(collator.compare);
    const choices = [];
    currencies.forEach((currency) => bands.forEach((band) => {
      const value = currency + ':' + band.value;
      if (seen.has(value)) {
        choices.push({ value, label: (currencyLabels[currency] || currency) + ' ' + band.label });
      }
    }));
    if (seen.has('unknown')) choices.push({ value: 'unknown', label: 'Unknown / no comparable fare' });
    return choices;
  }

  function mount({ table, items, configs, resetHost, onChange }) {
    const controls = [];
    const sortButtons = Array.from(table.querySelectorAll('thead button[data-sort]'));

    configs.forEach((config) => {
      const button = sortButtons.find((candidate) => candidate.dataset.sort === config.key);
      if (!button) throw new Error('No table column for filter ' + config.key);
      const select = document.createElement('select');
      select.className = 'comparison-filter';
      select.dataset.filter = config.key;
      select.setAttribute('aria-label', 'Filter ' + config.label);
      const all = document.createElement('option');
      all.value = '';
      all.textContent = config.allLabel || 'All values';
      select.appendChild(all);

      const present = new Set(items.map((item) => String(config.value(item))));
      const choices = config.choices || Array.from(present).sort(collator.compare)
        .map((value) => ({ value, label: value }));
      choices.filter((choice) => present.has(choice.value)).forEach((choice) => {
        const option = document.createElement('option');
        option.value = choice.value;
        option.textContent = choice.label;
        select.appendChild(option);
      });
      button.closest('th').appendChild(select);
      controls.push({ select, value: config.value });
    });

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'comparison-clear';
    clear.dataset.clearFilters = '';
    clear.textContent = 'Clear filters';
    clear.setAttribute('aria-label', 'Clear all column filters');
    resetHost.appendChild(clear);

    const activeCount = () => controls.filter(({ select }) => select.value !== '').length;
    const sync = () => { clear.disabled = activeCount() === 0; };
    controls.forEach(({ select }) => select.addEventListener('change', () => {
      sync();
      onChange();
    }));
    clear.addEventListener('click', () => {
      controls.forEach(({ select }) => { select.value = ''; });
      sync();
      onChange();
    });
    sync();

    return {
      activeCount,
      apply(rows) {
        const active = controls.filter(({ select }) => select.value !== '');
        return rows.filter((item) => active.every(({ select, value }) =>
          String(value(item)) === select.value));
      },
    };
  }

  window.SiteprepPackageTableFilters = { mount, priceBand, priceBucket, priceChoices };
})();
