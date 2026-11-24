import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const TEXT_MAX_BYTES = 65_536;
const SHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf('--' + name);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const paired = process.argv.find((part) => part.startsWith('--' + name + '='));
  return paired ? paired.slice(name.length + 3) : fallback;
}

const inputArg = arg('input', '/input');
const inputPath = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputPath)) {
  process.stderr.write('token radar: snapshot missing; pass --input <snapshot.json|directory>\n');
  process.exit(2);
}

const out = resolve(arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? root));
const snapshot = parseSnapshot(readFileSync(inputPath, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue) {
  process.stderr.write('token radar: board check failed: ' + issue + '\n');
  process.exit(1);
}

function copyTree(source: string, target: string): string[] {
  mkdirSync(target, { recursive: true });
  const names: string[] = [];
  for (const name of readdirSync(source)) {
    if (name.startsWith('.')) continue;
    const from = join(source, name);
    const to = join(target, name);
    const stat = statSync(from);
    if (stat.isDirectory()) names.push(...copyTree(from, to).map((entry) => name + '/' + entry));
    else if (stat.isFile()) {
      copyFileSync(from, to);
      names.push(name);
    }
  }
  return names;
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), JSON.stringify({
  as_of: snapshot.as_of,
  source: snapshot.source,
  model: radar.model,
  watchlist_size: snapshot.watchlist.length,
  rows: board,
}, null, 2) + '\n');

const dashboard = join(out, 'dashboard');
if (resolve(dashboard) !== resolve(join(root, 'dashboard'))) copyTree(join(root, 'dashboard'), dashboard);
writeFileSync(join(out, 'data.js'), dataScript(radar));

const shotSource = join(root, 'screenshots');
const shotTarget = join(out, 'screenshots');
if (resolve(shotSource) !== resolve(shotTarget)) copyTree(shotSource, shotTarget);
const shots = readdirSync(shotTarget).filter((name) => !name.startsWith('.'));
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write('token radar: invalid screenshot name: ' + name + '\n');
    process.exit(1);
  }
}

if (shots.length >= 3) {
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: SHOT_CAPS,
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  }));
} else {
  process.stderr.write('token radar: wrote the board and local dashboard; add three browser captures under screenshots/ and rerun to write dossier.json\n');
}

process.stdout.write(
  'token radar: ' + snapshot.protocols.length + ' protocols read; ' + board.length +
  ' tokenless candidates ranked; ' + snapshot.watchlist.length + ' watchlist protocols covered; ' +
  'peer multiple ' + radar.model.benchmark_multiple + ' from ' + radar.peer_sample_size + ' token-bearing records\n' +
  'token radar: output written to ' + out + '\n',
);
