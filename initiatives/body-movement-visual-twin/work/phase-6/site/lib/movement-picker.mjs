import { REGION_LABELS, filterMovements } from './movement-library.mjs';
import { TRADITION_LABELS } from './collection.mjs';

export function mountMovementPicker(panel, entries, { onSelect, onVariation }) {
  const $ = id => panel.querySelector(`#${id}`);
  const trigger = $('movement-trigger'), menu = $('movement-menu'), results = $('movement-results');
  const selector = $('movement-select');
  const state = { selected: selector.value, tradition: 'all', region: 'all', query: '' };
  $('collection-count').textContent = `${entries.length} studies`;
  for (const [id, label] of Object.entries(TRADITION_LABELS)) {
    const option = document.createElement('option'); option.value = id;
    option.textContent = `${label} · ${entries.filter(entry => entry.tradition === id).length}`;
    $('movement-tradition').append(option);
  }
  $('movement-tradition').firstElementChild.textContent = `All traditions · ${entries.length}`;
  for (const [id, label] of Object.entries(REGION_LABELS)) {
    const option = document.createElement('option'); option.value = id; option.textContent = label;
    $('movement-region').append(option);
  }
  function placeMenu() {
    if (menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0, bottom = top + (viewport?.height || window.innerHeight);
    const below = bottom - rect.bottom - 12, above = rect.top - top - 12;
    const upwards = below < 290 && above > below;
    menu.classList.toggle('opens-up', upwards);
    const available = Math.max(80, upwards ? above : below);
    // Measure actual search/filter/footer height: touch targets and wrapped
    // filters are taller, and the mobile keyboard changes usable space.
    const chrome = menu.offsetHeight - results.clientHeight;
    results.style.maxHeight = `${Math.max(40, Math.min(252, available - chrome - 6))}px`;
    menu.style.maxHeight = `${available}px`;
  }
  function setOpen(open, focus = true) {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.querySelector('.picker-chevron').textContent = open ? '⌃' : '⌄';
    if (open) { placeMenu(); if (focus) $('movement-search').focus({ preventScroll: true }); }
  }
  function renderResults() {
    const matches = filterMovements(entries, state);
    const groups = new Map();
    matches.forEach(entry => {
      const label = `${state.tradition === 'all' ? `${TRADITION_LABELS[entry.tradition]} · ` : ''}${entry.group}`;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(entry);
    });
    const fragment = document.createDocumentFragment();
    for (const [label, members] of groups) {
      const group = document.createElement('div'); group.className = 'movement-group';
      const heading = document.createElement('h3');
      const name = document.createElement('span'); name.textContent = label;
      const count = document.createElement('span'); count.textContent = members.length;
      heading.append(name, count); group.append(heading);
      for (const entry of members) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'movement-option';
        button.dataset.movementId = entry.id; button.setAttribute('aria-pressed', String(entry.id === state.selected));
        const text = document.createElement('span'); text.textContent = entry.label;
        const check = document.createElement('span'); check.className = 'picker-check'; check.setAttribute('aria-hidden', 'true'); check.textContent = entry.id === state.selected ? '✓' : '';
        button.append(text, check);
        button.addEventListener('click', () => { selector.value = entry.id; onSelect(entry.id); setOpen(false); trigger.focus({ preventScroll: true }); });
        group.append(button);
      }
      fragment.append(group);
    }
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'movement-empty'; empty.textContent = 'No matching movements.';
      const clear = document.createElement('button'); clear.type = 'button'; clear.textContent = 'Clear filters';
      clear.addEventListener('click', () => { Object.assign(state, { tradition: 'all', region: 'all', query: '' }); $('movement-search').value = ''; $('movement-tradition').value = 'all'; $('movement-region').value = 'all'; renderResults(); $('movement-search').focus(); });
      empty.append(clear); fragment.append(empty);
    }
    results.replaceChildren(fragment);
    $('movement-result-count').textContent = `${matches.length} ${matches.length === 1 ? 'study' : 'studies'}`;
    $('movement-clear').hidden = !state.query;
    placeMenu();
  }
  function updateMeta() {
    const entry = entries.find(entry => entry.id === state.selected);
    const variation = [ $('movement-range').value === 'smaller' ? 'smaller range' : '', $('movement-side').value === 'mirrored' ? 'mirrored' : '' ].filter(Boolean);
    $('movement-meta').textContent = [TRADITION_LABELS[entry.tradition], entry.position, ...variation].join(' · ');
    $('movement-variant-note').hidden = $('movement-side').value !== 'mirrored';
  }
  function select(id) {
    state.selected = id;
    const entry = entries.find(entry => entry.id === id);
    $('movement-selected-label').textContent = entry.label;
    $('movement-range').value = 'standard'; $('movement-side').value = 'original';
    updateMeta(); renderResults();
  }
  trigger.addEventListener('click', () => setOpen(menu.hidden));
  $('movement-search').addEventListener('input', event => { state.query = event.target.value; renderResults(); });
  $('movement-tradition').addEventListener('change', event => { state.tradition = event.target.value; renderResults(); });
  $('movement-region').addEventListener('change', event => { state.region = event.target.value; renderResults(); });
  $('movement-clear').addEventListener('click', () => { state.query = ''; $('movement-search').value = ''; renderResults(); $('movement-search').focus(); });
  $('movement-close').addEventListener('click', () => { setOpen(false); trigger.focus(); });
  $('movement-variations-toggle').addEventListener('click', () => {
    setOpen(false, false);
    const expanded = $('movement-variations').hidden;
    $('movement-variations').hidden = !expanded;
    $('movement-variations-toggle').setAttribute('aria-expanded', String(expanded));
    $('movement-variations-toggle').textContent = `Variations ${expanded ? '⌃' : '⌄'}`;
  });
  for (const id of ['movement-range', 'movement-side']) $(id).addEventListener('change', () => {
    updateMeta(); onVariation({ smaller: $('movement-range').value === 'smaller', mirrored: $('movement-side').value === 'mirrored' });
  });
  document.addEventListener('pointerdown', event => { if (!panel.querySelector('.movement-picker-anchor').contains(event.target)) setOpen(false, false); });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.focus(); }
    if (event.key === 'ArrowDown' && event.target === $('movement-search')) { event.preventDefault(); results.querySelector('button')?.focus(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && event.target.classList.contains('movement-option')) {
      event.preventDefault(); const buttons = [...results.querySelectorAll('.movement-option')];
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : buttons.indexOf(event.target) + (event.key === 'ArrowDown' ? 1 : -1);
      buttons[Math.max(0, Math.min(buttons.length - 1, target))].focus();
    }
  });
  window.addEventListener('resize', placeMenu);
  window.visualViewport?.addEventListener('resize', placeMenu);
  window.visualViewport?.addEventListener('scroll', placeMenu);
  window.addEventListener('scroll', placeMenu, { passive: true, capture: true });
  selector.hidden = true; $('movement-native-label').hidden = true; $('movement-picker').hidden = false;
  select(selector.value);
  return { select };
}
