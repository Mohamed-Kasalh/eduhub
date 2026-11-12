import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const SRC_DATA_DIR = path.join(SRC_DIR, 'data');
const SRC_MOCKS_DIR = path.join(SRC_DIR, 'mocks');

/**
 * Recursively collects `.ts` and `.tsx` source files under a directory.
 */
function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isInsideDir(candidatePath, targetDir) {
  const rel = path.relative(targetDir, candidatePath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveImportPath(importerPath, specifier) {
  if (specifier.startsWith('@/')) {
    return path.resolve(SRC_DIR, specifier.slice(2));
  }
  if (specifier.startsWith('.')) {
    return path.resolve(path.dirname(importerPath), specifier);
  }
  return null;
}

function isAllowedMockImporter(filePath) {
  const rel = path.relative(SRC_DIR, filePath).replaceAll(path.sep, '/');
  if (rel === 'main.tsx') return true;
  if (rel.startsWith('mocks/')) return true;
  if (rel.startsWith('test/')) return true;
  if (rel.includes('/__tests__/') || rel.startsWith('__tests__/')) return true;
  if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) return true;
  return false;
}

function isTypeOnlyNamedSpecifiers(elements) {
  return elements.length > 0 && elements.every((el) => el.isTypeOnly);
}

const violations = [];

for (const filePath of collectSourceFiles(SRC_DIR)) {
  const inMocksDir = isInsideDir(filePath, SRC_MOCKS_DIR);
  const inDataDir = isInsideDir(filePath, SRC_DATA_DIR);
  const allowMocksImport = isAllowedMockImporter(filePath);
  if (inMocksDir) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);

  function recordViolation(node, targetKind, specifier, reason) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({
      file: path.relative(ROOT_DIR, filePath).replaceAll(path.sep, '/'),
      line: line + 1,
      column: character + 1,
      targetKind,
      specifier,
      reason,
    });
  }

  function checkSpecifier(node, specifier, isTypeOnly) {
    const resolved = resolveImportPath(filePath, specifier);
    if (!resolved) return;

    if (isInsideDir(resolved, SRC_DATA_DIR) && !inDataDir && !isTypeOnly) {
      recordViolation(
        node,
        'src/data',
        specifier,
        'Runtime import from src/data is forbidden outside src/mocks (use `import type` or `export type` instead).'
      );
    }

    if (isInsideDir(resolved, SRC_MOCKS_DIR) && !allowMocksImport) {
      recordViolation(
        node,
        'src/mocks',
        specifier,
        'Direct import from src/mocks is forbidden outside tests and src/main.tsx mock bootstrap.'
      );
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      let isTypeOnly = false;
      if (clause) {
        if (clause.isTypeOnly) {
          isTypeOnly = true;
        } else if (
          !clause.name &&
          clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          isTypeOnlyNamedSpecifiers(clause.namedBindings.elements)
        ) {
          isTypeOnly = true;
        }
      }
      checkSpecifier(node, node.moduleSpecifier.text, isTypeOnly);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      let isTypeOnly = node.isTypeOnly;
      if (
        !isTypeOnly &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        isTypeOnlyNamedSpecifiers(node.exportClause.elements)
      ) {
        isTypeOnly = true;
      }
      checkSpecifier(node, node.moduleSpecifier.text, isTypeOnly);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      checkSpecifier(node, node.moduleReference.expression.text, node.isTypeOnly);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require';
        if (isDynamicImport || isRequireCall) {
          checkSpecifier(node, firstArg.text, false);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (violations.length > 0) {
  console.error(`Mock/data import policy check failed (${violations.length} violation(s)):`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}:${v.column} [${v.targetKind}] "${v.specifier}" -> ${v.reason}`);
  }
  process.exit(1);
}

console.log('check-no-mock-imports: OK (zero runtime src/data or unauthorized src/mocks imports outside src/mocks).');
