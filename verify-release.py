"""Run bounded local release checks; retain real commands, exits and full logs."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parent
finix = Path('/home/y0usaf/finix-bots-hide-20260909-215801')
evidence = root / 'evidence'
evidence.mkdir(exist_ok=True)
records = []

def run(name, argv, cwd=root, timeout=180):
    log = evidence / f'{name}.log'
    with log.open('w') as stream:
        result = subprocess.run(argv, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT, timeout=timeout)
    records.append({'name': name, 'argv': argv, 'cwd': str(cwd), 'exit': result.returncode, 'log': str(log)})
    (evidence / 'commands.json').write_text(json.dumps(records, indent=2) + '\n')
    print(f'{name}: exit {result.returncode}; {log}', flush=True)
    if result.returncode:
        print(log.read_text()[-8000:])
        sys.exit(result.returncode)
    return log.read_text()

pin = json.loads((finix / 'flake.lock').read_text())['nodes']['hermes-bots-mod']['locked']['rev']
assert pin == '2ed6aba6dbe3153550b08918d4cf80882169acdb'
pinned = subprocess.check_output(['git', 'show', f'{pin}:plugin.js'], cwd=root)
(evidence / 'pinned-plugin.js').write_bytes(pinned)
run('node-version', ['node', '--version'])
run('syntax', ['node', '--check', 'plugin.js'])
run('roster', ['node', 'roster.test.mjs', 'plugin.js'])
run('shelf', ['node', 'shelf.test.mjs', 'plugin.js'])
run('hide-react', ['node', 'hide.test.mjs', 'plugin.js'])
run('compatibility', ['python3', 'verify-compat.py', 'plugin.js', str(evidence / 'pinned-plugin.js')])
if shutil.which('chromium'):
    run('layout-chromium', ['python3', 'layout.test.py'])
else:
    print('Optional Chromium CSS layout check unavailable: chromium not on PATH', flush=True)
run('plugin-diff-check', ['git', 'diff', '--check'])
run('finix-diff-check', ['git', 'diff', '--check'], cwd=finix)
out = run('nix-build', ['nix', 'build', 'path:.#nixosConfigurations.y0usaf-desktop.config.user.dev.hermes.packages.botsMod', '--no-write-lock-file', '--no-link', '--print-out-paths', '-L'], cwd=finix, timeout=540)
outputs = [line.strip() for line in out.splitlines() if line.startswith('/nix/store/') and line.endswith('-hermes-bots-mod')]
assert len(outputs) == 1, outputs
store = Path(outputs[0])
assert (store / 'plugin.js').read_bytes() == (root / 'plugin.js').read_bytes(), 'Built plugin differs from verified worktree'
for name in ['hide.test.mjs', 'roster.test.mjs', 'shelf.test.mjs', 'package.json', 'package-lock.json', 'verify-compat.py']:
    assert (root / name).read_bytes() == (finix / 'modules/dev/hermes/patches/bots-hide-mode' / name).read_bytes(), name
refs = run('built-closure', ['nix-store', '--query', '--requisites', str(store)])
assert 'node_modules' not in refs and 'test-deps' not in refs, 'Test dependencies leaked into runtime closure'
result = {'pin': pin, 'build_output': str(store), 'plugin_sha256': hashlib.sha256((store / 'plugin.js').read_bytes()).hexdigest(),
          'pinned_plugin_sha256': hashlib.sha256(pinned).hexdigest(), 'built_plugin_equals_worktree': True,
          'integration_test_files_equal_worktree': True, 'test_dependencies_not_in_runtime_closure': True,
          'commands': str(evidence / 'commands.json')}
(evidence / 'verified-result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
