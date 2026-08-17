const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * CI runs the build-time test suite only as a side effect of the build: the
 * workflow's build step is `npm run build`, and `scripts/build.sh` invokes
 * `scripts/build_tests.sh` itself. That is one command instead of two, but it
 * couples CI's build-test coverage to a line inside a 500-line shell script.
 * Delete that line and the suite silently stops running - and the workflow
 * stays green, because nothing else asks for it.
 *
 * A guard inside build_tests.sh cannot catch that: if build.sh stops calling
 * the suite, the suite is not running to complain. So the guard lives here, in
 * the Playwright run, which the workflow invokes as its own separate step.
 */

const ROOT_DIR = path.resolve(__dirname, '..');

test.describe('build pipeline wiring', () => {
  test('BUILD-20 build.sh invokes build_tests.sh', () => {
    const buildScript = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'build.sh'), 'utf8');

    // Match the invocation, not a mention of it: the line must execute the
    // script, so a comment or an echo naming the path does not satisfy this.
    const invokes = buildScript
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .some((line) => /(^|[^#\w])"?\$?\{?ROOT_DIR\}?"?\/scripts\/build_tests\.sh"?/.test(line)
        || /(^|\s)(bash\s+)?"?\.?\/?scripts\/build_tests\.sh"?/.test(line));

    expect(
      invokes,
      'scripts/build.sh must run scripts/build_tests.sh - CI relies on `npm run build` '
      + 'to run the build-time tests and has no separate step for them. If the '
      + 'invocation is deliberately removed, restore a build-test step in '
      + '.github/workflows/gh-pages.yml and update BUILD_TECHDOC.md.',
    ).toBe(true);
  });

  test('BUILD-21 the browser setup scripts keep their split', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));

    // `--with-deps` installs Chromium's system libraries through the platform
    // package manager, which needs root. That is right for the CI runner and
    // wrong for a developer machine, so the two audiences get two scripts.
    expect(pkg.scripts['setup:browsers']).toBeDefined();
    expect(pkg.scripts['setup:browsers']).not.toContain('--with-deps');
    expect(pkg.scripts['setup:browsers:ci']).toContain('--with-deps');
  });
});
