/* The package descriptions are the only data source for this compact view. */
(() => {
  const body = document.getElementById('package-comparison-rows');
  if (!body) return;

  const normalize = (text) => text.replace(/\s+/g, ' ').trim();
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const weakEvidence = /no dependable|no strong independent|little dependable|insufficient guest|weak, old evidence|much too old|independent review corpus.*not found|historical ship feedback cannot validate/i;
  const caveat = /small|operator-hosted|\bbut\b|concerns|complaint|criticiz|limited evidence|not an independent|other routes|sample is|cannot establish/i;

  function reviewText(item) {
    const paragraph = Array.from(item.querySelectorAll('p'))
      .find((p) => /^Reviews:/.test(normalize(p.textContent)));
    const local = normalize(paragraph?.textContent || '').replace(/^Reviews:\s*/, '');
    const sharedLink = paragraph?.querySelector('a[href="#dabuka-reviews"], a[href="#rj-reviews"]');
    if (!sharedLink) return local;
    const heading = document.getElementById(sharedLink.hash.slice(1));
    const next = heading?.nextElementSibling;
    const shared = next?.matches('.topic-body') ? next.querySelector('p') : next;
    const assessment = normalize(shared?.textContent || '');
    // Bare references use the shared assessment; package-specific reviews stay.
    return /^Shared Dabuka operator review assessment\.$/.test(local)
      ? assessment : `${local} ${assessment}`;
  }

  function evidenceRank(text) {
    if (weakEvidence.test(text)) return 'Low';
    const counts = Array.from(text.matchAll(/([\d,]+)\s+(?:passenger\s+)?(?:reviews|ratings)\b/gi),
      (match) => Number(match[1].replaceAll(',', '')));
    return counts.some((count) => count >= 50) ? 'High' : 'Medium';
  }

  function excerpt(text, limit) {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).replace(/\s+\S*$/, '').replace(/[;,]$/, '')}…`;
  }

  function reviewSummary(text, rank) {
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z“])/)
      .filter((sentence) => !/^This assessment applies|^Shared Dabuka operator review assessment\.$/.test(sentence));
    const main = (rank === 'Low' && sentences.find((sentence) => weakEvidence.test(sentence)))
      || sentences.find((sentence) => /prais|positive/i.test(sentence)) || sentences[0] || '';
    const caution = rank === 'Low' ? '' : sentences.find((sentence) => sentence !== main && caveat.test(sentence));
    return { main: excerpt(main, 180), caution: excerpt(caution || '', 120) };
  }

  function firstFare(text) {
    const match = text.match(/(US\$|€|£|USD|EUR|GBP)\s*([\d,]+(?:\.\d+)?)/);
    const currency = { 'US$': 'USD', '€': 'EUR', '£': 'GBP' }[match?.[1]] || match?.[1] || '';
    return { currency, amount: match ? Number(match[2].replaceAll(',', '')) : null };
  }

  // Reading in DOM order also respects future promotions and removals. Country
  // headings remain identifiable after the shared topic library wraps content.
  let country = '';
  const packages = [];
  document.querySelectorAll('main h2, main .package-list > li[id^="package-"]').forEach((element) => {
    if (element.matches('h2')) {
      country = normalize(element.textContent);
      return;
    }
    const label = element.querySelector(':scope > strong')?.cloneNode(true);
    const itemId = label?.querySelector('.item-id')?.textContent || '';
    label?.querySelector('.item-id')?.remove();
    const name = normalize(label?.textContent || '').replace(/:\s*$/, '').trim();
    const price = normalize(element.querySelector('.package-meta')?.textContent || '').split('Price:')[1]?.trim() || '';
    const assessment = reviewText(element);
    const rank = evidenceRank(assessment);
    const summary = reviewSummary(assessment, rank);
    packages.push({ id: element.id, itemId, name, country, price, rank, summary,
      reviews: `${summary.main} ${summary.caution}`, fare: firstFare(price) });
  });

  function render(rows) {
    const fragment = document.createDocumentFragment();
    rows.forEach((item) => {
      const row = document.createElement('tr');
      row.dataset.packageId = item.id;
      const nameCell = document.createElement('th');
      nameCell.scope = 'row';
      const link = document.createElement('a');
      link.href = `#${item.id}`;
      link.textContent = item.name;
      const id = document.createElement('span');
      id.className = 'item-id';
      id.textContent = ` ${item.itemId}`;
      link.appendChild(id);
      nameCell.appendChild(link);
      row.appendChild(nameCell);
      ['country', 'price'].forEach((field) => {
        const cell = document.createElement('td');
        cell.className = `comparison-${field}`;
        cell.textContent = item[field];
        row.appendChild(cell);
      });
      const reviews = document.createElement('td');
      reviews.className = 'comparison-reviews';
      reviews.textContent = item.summary.main;
      if (item.summary.caution) {
        const caution = document.createElement('span');
        caution.className = 'comparison-caution';
        caution.textContent = item.summary.caution;
        reviews.appendChild(caution);
      }
      row.appendChild(reviews);
      const rank = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `review-rank review-rank-${item.rank.toLowerCase()}`;
      badge.textContent = item.rank;
      rank.appendChild(badge);
      row.appendChild(rank);
      fragment.appendChild(row);
    });
    body.replaceChildren(fragment);
  }

  document.getElementById('comparison-count').textContent = `${packages.length} packages`;
  render(packages);
  let activeColumn = '';
  let direction = 'ascending';
  const rankValues = { Low: 0, Medium: 1, High: 2 };
  const buttons = Array.from(document.querySelectorAll('.comparison-table [data-sort]'));
  buttons.forEach((button) => button.addEventListener('click', () => {
    const column = button.dataset.sort;
    direction = activeColumn === column
      ? (direction === 'ascending' ? 'descending' : 'ascending')
      : (column === 'rank' ? 'descending' : 'ascending');
    activeColumn = column;
    const multiplier = direction === 'ascending' ? 1 : -1;
    render([...packages].sort((a, b) => {
      let result;
      if (column === 'price') {
        // Missing prices stay last. No conversion or unstated exchange rate.
        if (a.fare.amount === null || b.fare.amount === null) {
          return a.fare.amount === b.fare.amount ? 0 : a.fare.amount === null ? 1 : -1;
        }
        result = collator.compare(a.fare.currency, b.fare.currency) || a.fare.amount - b.fare.amount;
      } else if (column === 'rank') {
        result = rankValues[a.rank] - rankValues[b.rank];
      } else {
        result = collator.compare(a[column], b[column]);
      }
      return result * multiplier;
    }));
    buttons.forEach((other) => {
      const selected = other === button;
      other.closest('th').setAttribute('aria-sort', selected ? direction : 'none');
      other.querySelector('.sort-indicator').textContent = selected
        ? (direction === 'ascending' ? '↑' : '↓') : '↕';
    });
    document.getElementById('comparison-sort-status').textContent = `Sorted by ${column}, ${direction}.`;
  }));

  // A jump also opens a topic that the reader has previously collapsed.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || (link.hash !== '#package-comparison' && !link.hash.startsWith('#package-'))) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor.matches('.topic-body') && ancestor.hidden) {
        ancestor.previousElementSibling?.querySelector('.topic-toggle')?.click();
      }
      ancestor = ancestor.parentElement;
    }
    if (target.nextElementSibling?.matches('.topic-body[hidden]')) {
      target.querySelector('.topic-toggle')?.click();
    }
  });
})();
