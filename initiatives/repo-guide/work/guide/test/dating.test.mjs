import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, test} from 'node:test';

import {classifySimulatorReview, newestCommitDate} from '../build/dating.mjs';

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

describe('simulator review dating', () => {
  test('a source change after the walkthrough produces a diagnostic without blocking', () => {
    const result = classifySimulatorReview('2026-08-15', '2026-08-17');
    assert.equal(result.simulator.possibly_stale, true);
    assert.deepEqual(result.diagnostics, [
      'Simulator may need re-watching: watched 2026-08-15; sources changed 2026-08-17.',
    ]);
  });

  test('a walkthrough on or after the source date stays quiet', () => {
    const result = classifySimulatorReview('2026-08-18', '2026-08-17');
    assert.equal(result.simulator.possibly_stale, false);
    assert.deepEqual(result.diagnostics, []);
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
