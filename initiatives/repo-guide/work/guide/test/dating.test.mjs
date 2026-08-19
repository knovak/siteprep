import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, test} from 'node:test';

import {classifyDating, newestCommitDate, validateDatingConfig} from '../build/dating.mjs';

const valid = {
  pdfs: [{id: 'description', label: 'Description PDF', link: 'https://drive.google.com/file/d/example/view', refreshed: '2026-08-18'}],
  simulator_watched: '2026-08-18',
};

function commit(root, path, content, date) {
  const fullPath = join(root, path);
  mkdirSync(join(fullPath, '..'), {recursive: true});
  writeFileSync(fullPath, content);
  execFileSync('git', ['-C', root, 'add', path]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Repo Guide', '-c', 'user.email=guide@example.com', 'commit', '-m', path], {
    env: {...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00Z`, GIT_COMMITTER_DATE: `${date}T12:00:00Z`},
    stdio: 'ignore',
  });
}

describe('PDF and simulator dating', () => {
  test('fresh PDFs stay plain; stale PDFs and simulator reviews report both dates without blocking', () => {
    const config = validateDatingConfig({
      pdfs: [
        valid.pdfs[0],
        {id: 'deck', label: 'Deck PDF', link: 'https://drive.google.com/file/d/deck/view', refreshed: '2026-08-16'},
      ],
      simulator_watched: '2026-08-15',
    });
    const result = classifyDating(config, '2026-08-18', '2026-08-17');
    assert.equal(result.pdfs[0].possibly_stale, false);
    assert.equal(result.pdfs[1].possibly_stale, true);
    assert.equal(result.simulator.possibly_stale, true);
    assert.deepEqual(result.diagnostics, [
      'PDF "Deck PDF" may be stale: refreshed 2026-08-16; sources changed 2026-08-18.',
      'Simulator may need re-watching: watched 2026-08-15; sources changed 2026-08-17.',
    ]);
  });

  test('a configured PDF without a link or refresh date is an error', () => {
    assert.throws(() => validateDatingConfig({...valid, pdfs: [{id: 'description', label: 'Description PDF', refreshed: '2026-08-18'}]}), /link must be an HTTPS link/);
    assert.throws(() => validateDatingConfig({...valid, pdfs: [{id: 'description', label: 'Description PDF', link: 'https://drive.google.com/file/d/example/view'}]}), /refreshed must be a real YYYY-MM-DD date/);
  });

  test('only commits touching the declared source paths advance the comparison date', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repo-guide-dating-'));
    execFileSync('git', ['-C', root, 'init'], {stdio: 'ignore'});
    commit(root, 'initiatives/sweep.json', '{}', '2026-08-16');
    commit(root, 'unrelated.txt', 'later', '2026-08-17');
    assert.equal(await newestCommitDate(root, ['initiatives/sweep.json']), '2026-08-16');
    commit(root, 'initiatives/sweep.json', '{"phases":[]}', '2026-08-18');
    assert.equal(await newestCommitDate(root, ['initiatives/sweep.json']), '2026-08-18');
  });
});
