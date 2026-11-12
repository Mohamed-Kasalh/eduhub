import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src/__tests__/resilience-cases.json');
const TEST_FILE = 'src/__tests__/routes.resilience.test.tsx';
const VITEST_BIN = path.join(ROOT_DIR, 'node_modules/vitest/vitest.mjs');
const FAILURE_LOG_PATH = '/tmp/resilience-cases-failures.log';

const CASE_TIMEOUT_MS = 60_000;
const CONCURRENCY = 4;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadCases() {
  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const cases = [
    {
      id: '[mode-c] [student-bootstrap] /student/dashboard :: RoleGuard',
      mode: 'mode-c',
      role: 'student-bootstrap',
      route: '/student/dashboard',
      component: 'RoleGuard',
    },
  ];

  const roles = ['guest', 'student', 'instructor', 'admin', 'supervisor'];
  const modes = ['mode-a', 'mode-b', 'mode-c'];

  for (const mode of modes) {
    for (const role of roles) {
      for (const spec of raw.routesByRole[role] ?? []) {
        if (mode === 'mode-c' && !spec.fetchesOnMount) continue;
        cases.push({
          id: `[${mode}] [${role}] ${spec.path} :: ${spec.component}`,
          mode,
          role,
          route: spec.path,
          component: spec.component,
        });
      }
    }
  }
  return cases;
}

function parseArgs(argv) {
  const filters = { mode: null, role: null, search: null };
  for (const arg of argv) {
    if (arg.startsWith('--mode=')) filters.mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--role=')) filters.role = arg.slice('--role='.length);
    else if (arg.startsWith('--filter=')) filters.search = arg.slice('--filter='.length);
  }
  return filters;
}

function extractSummaryError(output) {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const priority =
    lines.find((l) => /render loop in /i.test(l)) ??
    lines.find((l) => /Maximum update depth exceeded/i.test(l)) ??
    lines.find((l) => /^Error:/i.test(l)) ??
    lines.find((l) => /Unexpected console output/i.test(l)) ??
    lines.find((l) => /\[mode-[abc]\]/i.test(l) && /expected|stuck|remaining|still/i.test(l)) ??
    lines.find((l) => /FAIL|Error/i.test(l));

  if (!priority) return '';
  return priority.length > 90 ? `${priority.slice(0, 87)}...` : priority;
}

const activeChildren = new Set();

function killChildTree(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // already exited
    }
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const child of activeChildren) {
      killChildTree(child);
    }
    process.exit(130);
  });
}

function runSingleCase(testCase) {
  return new Promise((resolve) => {
    const start = Date.now();
    const pattern = `${escapeRegex(testCase.id)}$`;
    const child = spawn(
      process.execPath,
      [
        VITEST_BIN,
        'run',
        TEST_FILE,
        '--reporter=dot',
        '--maxWorkers',
        '1',
        '--no-file-parallelism',
        '-t',
        pattern,
      ],
      {
        cwd: ROOT_DIR,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true', NO_COLOR: '1' },
      }
    );

    activeChildren.add(child);
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.on('data', (chunk) => {
      if (stdout.length < 32_768) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 32_768) stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      killChildTree(child);
    }, CASE_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      activeChildren.delete(child);
      const durationMs = Date.now() - start;
      const combined = `${stdout}\n${stderr}`;

      if (timedOut) {
        resolve({
          ...testCase,
          status: 'TIMEOUT',
          durationMs,
          summary: `Timed out after ${Math.round(CASE_TIMEOUT_MS / 1000)}s`,
          output: combined,
        });
        return;
      }

      if (code === 0 && /Tests\s+1 passed\b/i.test(combined)) {
        resolve({
          ...testCase,
          status: 'PASS',
          durationMs,
          summary: '',
          output: '',
        });
        return;
      }

      resolve({
        ...testCase,
        status: 'FAIL',
        durationMs,
        summary: extractSummaryError(combined) || `Exit code ${code ?? 'null'}`,
        output: combined,
      });
    });
  });
}

async function main() {
  if (!fs.existsSync(VITEST_BIN)) {
    console.error(`Vitest binary not found at ${VITEST_BIN}`);
    process.exit(1);
  }

  const filters = parseArgs(process.argv.slice(2));
  let cases = loadCases();
  if (filters.mode) cases = cases.filter((c) => c.mode === filters.mode);
  if (filters.role) cases = cases.filter((c) => c.role === filters.role);
  if (filters.search) cases = cases.filter((c) => c.id.includes(filters.search));

  if (cases.length === 0) {
    console.error('No resilience cases matched the provided filters.');
    process.exit(1);
  }

  console.error(`Running ${cases.length} resilience cases (${CONCURRENCY} parallel, ${CASE_TIMEOUT_MS / 1000}s timeout/case)...`);

  const results = new Array(cases.length);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= cases.length) return;
      const res = await runSingleCase(cases[idx]);
      results[idx] = res;
      completed += 1;
      if (res.status !== 'PASS' || completed % 20 === 0 || completed === cases.length) {
        console.error(`[${completed}/${cases.length}] ${res.status} ${res.mode} ${res.role} ${res.route} (${res.durationMs}ms)${res.summary ? ` -> ${res.summary}` : ''}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cases.length) }, () => worker()));

  const failureLogs = results
    .filter((r) => r.status !== 'PASS')
    .map((r) => `=== ${r.status} ${r.id} (${r.durationMs}ms) ===\n${r.output}`)
    .join('\n\n');
  fs.writeFileSync(FAILURE_LOG_PATH, failureLogs, 'utf8');

  console.log('| Mode | Role | Route | Component | Status | Time (s) | Detail |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of results) {
    const secs = (r.durationMs / 1000).toFixed(1);
    const detail = r.summary.replaceAll('|', '\\|');
    console.log(`| ${r.mode} | ${r.role} | \`${r.route}\` | ${r.component} | ${r.status} | ${secs} | ${detail} |`);
  }

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const timeoutCount = results.filter((r) => r.status === 'TIMEOUT').length;

  console.log('');
  console.log(`Summary: total=${results.length}, PASS=${passCount}, FAIL=${failCount}, TIMEOUT=${timeoutCount}`);
  if (failCount + timeoutCount > 0) {
    console.log(`Failure details saved to ${FAILURE_LOG_PATH}`);
    process.exit(1);
  }
}

await main();
