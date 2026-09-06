import assert from 'node:assert/strict';
import {test} from 'node:test';

import {MemoryBookmarkStore} from '../src/memory-store.mjs';
import {compileSelection, evaluateSelection, normaliseSearchValue, normaliseTitle, proposeSelections, wrapUiSelection} from '../src/selections.mjs';

const items = [
  {id: 'a', collection_id: 'alpha', url: 'https://news.test/one', title: 'Rust: A Guide!', title_key: normaliseTitle('Rust: A Guide!'), tags: ['topic:rust', 'src:safari', 'folder:reading/rust', 'err:404']},
  {id: 'b', collection_id: 'alpha', url: 'https://news.test/two', title: 'Rust — A Guide', title_key: normaliseTitle('Rust — A Guide'), tags: ['topic:rust', 'saved:later', 'src:safari', 'folder:reading/rust', 'err:404']},
  {id: 'c', collection_id: 'alpha', url: 'https://other.test/three', title: 'Gardens', title_key: normaliseTitle('Gardens'), tags: ['topic:garden', 'saved:later', 'src:firefox', 'folder:reading/garden', 'err:timeout']},
  {id: 'd', collection_id: 'beta', url: 'https://news.test/four', title: 'Rust A Guide', title_key: normaliseTitle('Rust A Guide'), tags: ['topic:rust', 'src:firefox', 'folder:reading/rust']},
];

test('selection grammar covers precedence, grouping, not, wildcards, unknown tags, and clear errors', () => {
  assert.deepEqual(evaluateSelection(items, 'topic:garden or topic:rust and saved:later').map(item => item.id), ['b', 'c']);
  assert.deepEqual(evaluateSelection(items, '(topic:garden or topic:rust) and saved:later').map(item => item.id), ['b', 'c']);
  assert.deepEqual(evaluateSelection(items, 'topic:rust and not saved:later').map(item => item.id), ['a', 'd']);
  assert.deepEqual(evaluateSelection(items, 'folder:reading/*').map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(evaluateSelection(items, 'title:*a-guide*').map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(evaluateSelection(items, 'folder:*rust*').map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(evaluateSelection(items, 'topic:*us*').map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(evaluateSelection(items, 'src:*irefo*').map(item => item.id), ['c', 'd']);
  assert.deepEqual(evaluateSelection(items, '*rust*').map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(evaluateSelection(items, 'unknown:value'), []);
  assert.throws(() => compileSelection('topic:rust and (saved:later or)'), /Expected a tag.*character/);
  for (const expression of ['*', '**', 'title:**', 'title:*guide', 'title:g*ide*', 'topic:*:rust']) {
    assert.throws(() => compileSelection(expression), /wildcard.*character/i);
  }
});

test('folder, tag, and source searches share title-style normalised keys', () => {
  const punctuationItems = [
    {...items[0], id: 'punctuation', tags: ['Topic:Modern & Art', 'SRC:Safari & Reading', 'Folder:Reading & Research/Rust']},
    {...items[0], id: 'spacing', tags: ['topic:Modern — Art', 'src:Safari Reading', 'folder:Reading Research Rust']},
  ];
  assert.equal(normaliseSearchValue('  Reading & Research/Rust  '), 'reading-research-rust');
  assert.deepEqual(evaluateSelection(punctuationItems, 'topic:modern-art').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'src:safari-reading').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'folder:reading-research-rust').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'topic:modern*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'src:safari*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'folder:reading-research*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'title:*rust-a*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'topic:*modern-art*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'src:*safari-read*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'folder:*research-rust*').map(item => item.id), ['punctuation', 'spacing']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'tag-key:Topic%3AModern%20%26%20Art').map(item => item.id), ['punctuation']);
  assert.deepEqual(evaluateSelection(punctuationItems, 'folder-key:Reading%20%26%20Research%2FRust').map(item => item.id), ['punctuation']);

  const proposals = proposeSelections(punctuationItems);
  assert.deepEqual(proposals.find(proposal => proposal.id === 'tag:topic:modern-art'), {
    id: 'tag:topic:modern-art', kind: 'tag', key: 'topic:modern-art', name: 'topic:modern-art', expression: 'topic:modern-art', count: 2,
  });
  assert.deepEqual(proposals.find(proposal => proposal.id === 'src:safari-reading'), {
    id: 'src:safari-reading', kind: 'src', key: 'safari-reading', name: 'safari-reading', expression: 'src:safari-reading', count: 2,
  });
  assert.deepEqual(proposals.find(proposal => proposal.id === 'folder:reading-research-rust'), {
    id: 'folder:reading-research-rust', kind: 'folder', key: 'reading-research-rust', name: 'reading-research-rust', expression: 'folder:reading-research-rust', count: 2,
  });
});

test('UI scope wrapping and administrative selection use the same evaluator', () => {
  assert.equal(wrapUiSelection('alpha', 'collection:beta or topic:rust'), 'collection:alpha and (collection:beta or topic:rust)');
  assert.deepEqual(evaluateSelection(items, 'collection:beta or topic:rust', {collectionId: 'alpha'}).map(item => item.id), ['a', 'b']);
  assert.deepEqual(evaluateSelection(items, 'collection:beta or topic:garden').map(item => item.id), ['c', 'd']);
});

test('verdict clauses use the labels visible in the interface', () => {
  const verdictItems = [
    {...items[0], id: 'keep', verdict: 'keeper'},
    {...items[0], id: 'junk', verdict: 'junk'},
    {...items[0], id: 'archive', verdict: 'archive'},
    {...items[0], id: 'needs-time', verdict: 'needs-more-time'},
    {...items[0], id: 'untriaged', verdict: null},
  ];
  for (const id of ['keep', 'junk', 'archive', 'needs-time', 'untriaged']) {
    assert.deepEqual(evaluateSelection(verdictItems, `verdict:${id}`).map(item => item.id), [id]);
  }
  assert.deepEqual(evaluateSelection(verdictItems, 'verdict:keep or verdict:needs-time').map(item => item.id), ['keep', 'needs-time']);
});

test('image clauses distinguish stored, failed, and absent pictures', () => {
  const imageItems = [
    {...items[0], id: 'present', capture: {image_ref: 'capture/one.webp', state: 'pass1-ready', displayable: true}},
    {...items[0], id: 'hidden', capture: {image_ref: 'capture/duplicate.webp', state: 'pass1-ready', displayable: false}},
    {...items[0], id: 'failed', capture: {image_ref: null, state: 'pass1-error', error_tag: 'err:503'}},
    {...items[0], id: 'none', capture: null},
  ];
  assert.deepEqual(evaluateSelection(imageItems, 'image:present').map(item => item.id), ['present']);
  assert.deepEqual(evaluateSelection(imageItems, 'image:failed').map(item => item.id), ['failed']);
  assert.deepEqual(evaluateSelection(imageItems, 'image:none').map(item => item.id), ['hidden', 'none']);
});

test('cheap proposals are ordinary selections and mutable folder tags are recomputed on demand', () => {
  assert.equal(normaliseTitle('  Rust — A GUIDE! '), 'rust-a-guide');
  const first = proposeSelections(items);
  const site = first.find(proposal => proposal.id === 'site:news.test');
  const title = first.find(proposal => proposal.id === 'title:rust-a-guide');
  const folder = first.find(proposal => proposal.id === 'folder:reading-rust');
  const source = first.find(proposal => proposal.id === 'src:safari');
  const tag = first.find(proposal => proposal.id === 'tag:topic:rust');
  const image = first.find(proposal => proposal.id === 'image:none');
  const verdicts = first.filter(proposal => proposal.kind === 'verdict');
  const errors = first.filter(proposal => proposal.kind === 'error');
  assert.equal(site.count, 3);
  assert.equal(title.count, 3);
  assert.equal(folder.count, 3);
  assert.equal(source.count, 2);
  assert.equal(tag.count, 3);
  assert.equal(image.count, 4);
  assert.equal(folder.expression, 'folder:reading-rust');
  assert.equal(source.expression, 'src:safari');
  assert.equal(tag.expression, 'topic:rust');
  assert.deepEqual(verdicts.map(proposal => [proposal.name, proposal.count]), [
    ['not junk', 4], ['untriaged', 4], ['untriaged or needs-time', 4],
  ]);
  assert.deepEqual(errors.map(proposal => [proposal.name, proposal.count]), [
    ['any error', 3], ['err:404', 2], ['err:timeout', 1],
  ]);
  assert.equal(first.some(proposal => proposal.kind === 'tag' && proposal.name.startsWith('err:')), false);
  assert.deepEqual([...new Set(first.map(proposal => proposal.kind))], ['src', 'tag', 'verdict', 'error', 'folder', 'site', 'image', 'title']);
  assert.ok(first.every(proposal => !proposal.name.startsWith('Same ')));
  assert.deepEqual(evaluateSelection(items, site.expression).map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(evaluateSelection(items, tag.expression).map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(evaluateSelection(items, verdicts.at(-1).expression).map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(evaluateSelection(items, verdicts.find(proposal => proposal.name === 'not junk').expression).map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(evaluateSelection(items, errors.find(proposal => proposal.name === 'any error').expression).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(evaluateSelection(items, errors.find(proposal => proposal.name === 'err:404').expression).map(item => item.id), ['a', 'b']);

  const changed = structuredClone(items);
  changed[1].tags = ['topic:rust', 'saved:later', 'folder:reading/changed'];
  assert.equal(proposeSelections(changed).some(proposal => proposal.id === 'folder:reading-rust'), true);
  assert.equal(proposeSelections(changed).find(proposal => proposal.id === 'folder:reading-rust').count, 2);
});

test('saved selections, additive tags, mark-then-sweep, and one-action undo share the same item set', () => {
  const store = new MemoryBookmarkStore();
  store.createCollection({id: 'pile', name: 'Pile'});
  for (let index = 0; index < 50; index += 1) {
    const item = store.insertItem({
      collection_id: 'pile', url: `https://example.test/${index}`, url_key: `https://example.test/${index}`,
      title: `Example ${index}`, title_key: `example-${index}`, note: null, added_at: null,
      ingested_at: '2026-08-18T00:00:00Z', verdict: null, verdict_at: null,
    });
    store.addTags(item.id, [index < 40 ? 'group:large' : 'group:small', 'existing']);
  }
  store.saveSelection('pile', {id: 'saved-1', name: 'Large', expression: 'group:large'});
  store.saveSelection('pile', {id: 'saved-2', name: 'Twenties', expression: 'title:*example-2*'});
  assert.equal(store.selection('pile', 'saved-1').expression, 'group:large');
  assert.equal(store.selection('pile', 'saved-2').expression, 'title:*example-2*');
  assert.deepEqual(evaluateSelection(store.listAllItems('pile'), store.selection('pile', 'saved-2').expression).map(item => item.title), [
    'Example 2', 'Example 20', 'Example 21', 'Example 22', 'Example 23', 'Example 24',
    'Example 25', 'Example 26', 'Example 27', 'Example 28', 'Example 29',
  ]);
  assert.equal(store.listSelections('pile').length, 2);

  const session = store.startSession('pile', {id: 'session-1', startedAt: '2026-08-18T12:00:00Z'});
  const selected = evaluateSelection(store.listAllItems('pile'), 'group:large', {collectionId: 'pile'});
  const tagged = store.applyTags('pile', {itemIds: selected.map(item => item.id), tags: ['existing', 'cluster:large'], at: '2026-08-18T12:01:00Z', sessionId: session.id, actionId: 'tag-1'});
  assert.equal(tagged.changes.length, 40);
  assert.ok(store.listAllItems('pile').filter(item => item.tags.includes('cluster:large')).length === 40);
  const tagUndo = store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:02:00Z'});
  assert.equal(tagUndo.kind, 'tag-apply');
  assert.equal(store.listAllItems('pile').filter(item => item.tags.includes('cluster:large')).length, 0);
  assert.ok(store.listAllItems('pile').every(item => item.tags.includes('existing')));

  const untagged = store.removeTags('pile', {itemIds: selected.map(item => item.id), tags: ['existing', 'missing'], at: '2026-08-18T12:02:30Z', sessionId: session.id, actionId: 'tag-remove-1'});
  assert.equal(untagged.kind, 'tag-remove');
  assert.equal(untagged.changes.length, 40);
  assert.ok(selected.every(item => !store.listAllItems('pile').find(candidate => candidate.id === item.id).tags.includes('existing')));
  const untagUndo = store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:02:45Z'});
  assert.equal(untagUndo.kind, 'tag-remove');
  assert.ok(store.listAllItems('pile').every(item => item.tags.includes('existing')));

  const marked = new Set(selected.slice(0, 4).map(item => item.id));
  const rest = selected.filter(item => !marked.has(item.id));
  const swept = store.applyVerdict('pile', {itemIds: rest.map(item => item.id), verdict: 'junk', at: '2026-08-18T12:03:00Z', sessionId: session.id, actionId: 'sweep-1'});
  assert.equal(swept.changes.length, 36);
  assert.equal(store.countUntriagedItems('pile'), 14);
  const sweepUndo = store.undoLast('pile', {sessionId: session.id, at: '2026-08-18T12:04:00Z'});
  assert.equal(sweepUndo.kind, 'verdict');
  assert.equal(sweepUndo.changes.length, 36);
  assert.equal(store.countUntriagedItems('pile'), 50);
});

test('contains matching stays linear over a 10,000-item collection', () => {
  const largeCollection = Array.from({length: 10_000}, (_, index) => ({
    id: `item-${index}`,
    collection_id: 'large',
    url: `https://example.test/${index}`,
    title: index % 100 === 0 ? `Reference needle ${index}` : `Reference ${index}`,
    title_key: index % 100 === 0 ? `reference-needle-${index}` : `reference-${index}`,
    tags: [index % 250 === 0 ? 'folder:Research/Needle' : 'folder:Research/Other'],
  }));
  assert.equal(evaluateSelection(largeCollection, 'title:*needle*', {collectionId: 'large'}).length, 100);
  assert.equal(evaluateSelection(largeCollection, 'folder:*needle*', {collectionId: 'large'}).length, 40);
});


test('verdict-filtered proposals count intersections, retain single matches, and omit empty groups', () => {
  const mixed = structuredClone(items);
  mixed[0].verdict = 'keeper';
  mixed[1].verdict = 'junk';
  mixed[2].verdict = 'needs-more-time';
  mixed[3].verdict = 'archive';
  const expression = '(verdict:keep or verdict:needs-time)';
  const filtered = proposeSelections(mixed, {expression});
  assert.equal(filtered.find(proposal => proposal.id === 'site:news.test').count, 1);
  assert.equal(filtered.find(proposal => proposal.id === 'title:rust-a-guide').count, 1);
  assert.equal(filtered.find(proposal => proposal.id === 'tag:topic:rust').count, 1);
  assert.equal(filtered.find(proposal => proposal.id === 'error:any').count, 2);
  for (const proposal of filtered) {
    assert.equal(proposal.count, evaluateSelection(mixed, `${expression} and (${proposal.expression})`).length, proposal.id);
    assert.ok(proposal.count > 0);
  }
  assert.equal(filtered.some(proposal => proposal.id === 'verdict:junk'), false);
  assert.equal(filtered.some(proposal => proposal.id === 'verdict:archive'), false);
  assert.deepEqual(proposeSelections(mixed, {expression: 'not verdict:*'}), []);
  assert.deepEqual(proposeSelections([]), []);
});
