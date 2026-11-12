import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SERVICES_DIR = path.join(ROOT_DIR, 'src/api/services');
const HANDLERS_DIR = path.join(ROOT_DIR, 'src/mocks/handlers');
const CONTRACT_DOC_PATH = path.join(ROOT_DIR, 'docs/API_CONTRACT.md');

function normalizePath(raw) {
  return raw
    .trim()
    .replace(/\/\$\{encodeURIComponent\([^)]+\)\}/g, '/:id')
    .replace(/\/\$\{[^}]+\}/g, '/:id')
    .replace(/\/:[a-zA-Z0-9_]+/g, '/:id')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')
    .replace(/^([^\/])/, '/$1');
}

function extractServiceEndpoints() {
  const endpoints = new Map(); // key -> { method, path, file }
  const files = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith('.service.ts'));

  for (const file of files) {
    const filePath = path.join(SERVICES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Match declared path variables (e.g. const path = `/instructor/courses/${...}/questions/import`)
    const pathVars = new Map();
    const varRegex = /(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*[`\x27"]([^`\x27"]+)[`\x27"]/g;
    let varMatch;
    while ((varMatch = varRegex.exec(content)) !== null) {
      if (varMatch[2].startsWith('/')) {
        pathVars.set(varMatch[1], varMatch[2]);
      }
    }

    // 2. Direct http calls, uploads and downloads
    const callRegex = /(?:http\.(get|post|put|patch|delete)|(upload)|(download))\s*(?:<[^>]+>)?\s*\(\s*([`\x27"][^`\x27"]+[`\x27"]|[a-zA-Z0-9_]+)/g;
    let callMatch;
    while ((callMatch = callRegex.exec(content)) !== null) {
      const method = (callMatch[1] || (callMatch[2] ? 'post' : 'get')).toUpperCase();
      let rawPath = callMatch[4];
      if (rawPath.startsWith('`') || rawPath.startsWith('\'') || rawPath.startsWith('"')) {
        rawPath = rawPath.slice(1, -1);
      } else if (pathVars.has(rawPath)) {
        rawPath = pathVars.get(rawPath);
      } else {
        continue;
      }

      if (!rawPath.startsWith('/')) continue;
      const normalized = normalizePath(rawPath);
      const key = `${method} ${normalized}`;
      endpoints.set(key, { method, path: normalized, file });
    }
  }

  return endpoints;
}

function extractHandlerEndpoints() {
  const endpoints = new Map();
  const files = fs.readdirSync(HANDLERS_DIR).filter((f) => f.endsWith('.handlers.ts'));

  for (const file of files) {
    const filePath = path.join(HANDLERS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Match single endpoint registration: http.method(apiEndpoint('/path'), ...)
    const singleRegex = /http\.(get|post|put|patch|delete)\s*\(\s*apiEndpoint\(\s*[`\x27"]([^`\x27"]+)[`\x27"]\s*\)/g;
    let match;
    while ((match = singleRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const normalized = normalizePath(match[2]);
      const key = `${method} ${normalized}`;
      endpoints.set(key, { method, path: normalized, file });
    }

    // Match array registration: [apiEndpoint('/path1'), apiEndpoint('/path2')].forEach(...)
    const arrayBlockRegex = /\[\s*(apiEndpoint\([^)]+\)[^\]]*)]\s*\.\s*forEach\s*\(\s*\(\s*path\s*\)\s*=>\s*\{\s*handlers\.push\(\s*http\.(get|post|put|patch|delete)/g;
    let arrMatch;
    while ((arrMatch = arrayBlockRegex.exec(content)) !== null) {
      const block = arrMatch[1];
      const method = arrMatch[2].toUpperCase();
      const innerRegex = /apiEndpoint\(\s*[`\x27"]([^`\x27"]+)[`\x27"]\s*\)/g;
      let inner;
      while ((inner = innerRegex.exec(block)) !== null) {
        const normalized = normalizePath(inner[1]);
        const key = `${method} ${normalized}`;
        endpoints.set(key, { method, path: normalized, file });
      }
    }
  }

  return endpoints;
}

function extractDocEndpoints() {
  const endpoints = new Map();
  if (!fs.existsSync(CONTRACT_DOC_PATH)) {
    throw new Error(`API contract document not found at ${CONTRACT_DOC_PATH}`);
  }

  const content = fs.readFileSync(CONTRACT_DOC_PATH, 'utf8');
  // Match code spans with HTTP method + path: `GET /courses/:id`
  const docRegex = /`([A-Z]{3,7})\s+([/][^`\s,]+)`/g;
  let match;
  while ((match = docRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];
    const normalized = normalizePath(rawPath);
    const key = `${method} ${normalized}`;
    endpoints.set(key, { method, path: normalized, file: 'docs/API_CONTRACT.md' });
  }

  return endpoints;
}

function main() {
  const serviceMap = extractServiceEndpoints();
  const handlerMap = extractHandlerEndpoints();
  const docMap = extractDocEndpoints();

  const serviceKeys = new Set(serviceMap.keys());
  const handlerKeys = new Set(handlerMap.keys());
  const docKeys = new Set(docMap.keys());

  const missingInHandlers = [...serviceKeys].filter((k) => !handlerKeys.has(k));
  const missingInServicesFromHandlers = [...handlerKeys].filter((k) => !serviceKeys.has(k));

  const missingInDoc = [...serviceKeys].filter((k) => !docKeys.has(k));
  const missingInServicesFromDoc = [...docKeys].filter((k) => !serviceKeys.has(k));

  let hasErrors = false;

  if (missingInHandlers.length > 0) {
    hasErrors = true;
    console.error(`\n[ERROR] ${missingInHandlers.length} endpoint(s) used in src/api/services are missing from MSW handlers:`);
    for (const ep of missingInHandlers) {
      console.error(`  - ${ep} (from ${serviceMap.get(ep)?.file})`);
    }
  }

  if (missingInServicesFromHandlers.length > 0) {
    hasErrors = true;
    console.error(`\n[ERROR] ${missingInServicesFromHandlers.length} endpoint(s) mocked in MSW handlers are missing from src/api/services:`);
    for (const ep of missingInServicesFromHandlers) {
      console.error(`  - ${ep} (from ${handlerMap.get(ep)?.file})`);
    }
  }

  if (missingInDoc.length > 0) {
    hasErrors = true;
    console.error(`\n[ERROR] ${missingInDoc.length} endpoint(s) used in src/api/services are missing from docs/API_CONTRACT.md:`);
    for (const ep of missingInDoc) {
      console.error(`  - ${ep} (from ${serviceMap.get(ep)?.file})`);
    }
  }

  if (missingInServicesFromDoc.length > 0) {
    hasErrors = true;
    console.error(`\n[ERROR] ${missingInServicesFromDoc.length} endpoint(s) documented in docs/API_CONTRACT.md are missing from src/api/services:`);
    for (const ep of missingInServicesFromDoc) {
      console.error(`  - ${ep}`);
    }
  }

  if (hasErrors) {
    console.error('\nAPI Contract check failed: discrepancies found between services, mock handlers, and contract doc.');
    process.exit(1);
  }

  console.log(`check-contract: OK (${serviceKeys.size} endpoints perfectly aligned across services, MSW handlers, and docs/API_CONTRACT.md).`);
}

main();
