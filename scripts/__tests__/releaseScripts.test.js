const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const repoRoot = path.resolve(__dirname, '../..');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voxtrail-script-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'bin'));
  return dir;
}
function executable(dir, name, source) {
  fs.writeFileSync(path.join(dir, 'bin', name), source, { mode: 0o700 });
}

for (const existing of [false, true]) {
  test(`emulator runner isolates configuration and restores existing dotenv: ${existing}`, (t) => {
    const dir = fixture(t);
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.mkdirSync(path.join(dir, 'travel-app-be'));
    fs.copyFileSync(path.join(repoRoot, 'scripts/run-emulator-tests.js'), path.join(dir, 'scripts/run-emulator-tests.js'));
    fs.writeFileSync(path.join(dir, 'travel-app-be/firebase.json'), JSON.stringify({ firestore: { rules: 'firestore.rules' } }));
    const localEnv = path.join(dir, 'travel-app-be/.env.local');
    if (existing) fs.writeFileSync(localEnv, 'PRIVATE_VALUE=preserve-me\n');
    executable(dir, 'firebase', `#!/bin/sh
cat .env.local > "$TRACE_FILE"
cat .firebase-emulator.generated.json >> "$TRACE_FILE"
exit 7
`);
    const trace = path.join(dir, 'trace');
    const result = spawnSync(process.execPath, [path.join(dir, 'scripts/run-emulator-tests.js')], {
      env: { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, TRACE_FILE: trace }, encoding: 'utf8',
    });
    assert.equal(result.status, 7);
    const duringRun = fs.readFileSync(trace, 'utf8');
    assert.match(duringRun, /REQUEST_SIGNING_SECRET=emulator-signing-secret-only/);
    assert.match(duringRun, /OPENROUTER_API_KEY=""/);
    assert.match(duringRun, /firestore.emulator.rules/);
    assert.doesNotMatch(duringRun, /preserve-me/);
    assert.equal(fs.existsSync(path.join(dir, 'travel-app-be/.firebase-emulator.generated.json')), false);
    if (existing) assert.equal(fs.readFileSync(localEnv, 'utf8'), 'PRIVATE_VALUE=preserve-me\n');
    else assert.equal(fs.existsSync(localEnv), false);
  });
}
for (const failedSuite of ['frontend', 'backend']) {
  test(`deployment refuses failed ${failedSuite} tests even with --force`, (t) => {
    const dir = fixture(t);
    executable(dir, 'firebase', `#!/bin/sh
if [ "$1" = "--version" ]; then echo 15.28.2; exit 0; fi
echo "$*" >> "$TRACE_FILE"
exit 0
`);
    executable(dir, 'npm', `#!/bin/sh
echo "$PWD $*" >> "$TRACE_FILE"
case "$PWD" in
  */travel-app-fe) [ "$FAILED_SUITE" = "frontend" ] && exit 1 ;;
  */travel-app-be) [ "$FAILED_SUITE" = "backend" ] && exit 1 ;;
esac
exit 0
`);
    const trace = path.join(dir, 'trace');
    const result = spawnSync('bash', [path.join(repoRoot, 'scripts/firebase-deploy.sh'), '--force', '--skip-checks', '--skip-deps', '--project', 'demo-voxtrail'], {
      env: { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, TRACE_FILE: trace, FAILED_SUITE: failedSuite }, encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /tests failed; refusing deployment/);
    assert.doesNotMatch(fs.readFileSync(trace, 'utf8'), /run build|deploy/);
  });
}
