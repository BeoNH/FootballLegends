#!/usr/bin/env node
/**
 * Tick checklist review sau Play mode — /checklist-done
 * Usage: node mark-review-done.mjs [--dry-run] [F001]
 *        npm run review:done -- [F001]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DOCS = join(ROOT, '.cursor', 'docs');
const FEATURES = join(DOCS, 'features');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const featureArg = args.find((a) => !a.startsWith('--'));

function tickMarkdownCheckboxes(content) {
  return content.replace(/^- \[ \] /gm, '- [x] ');
}

function setStatus(content, status) {
  return content.replace(
    /(\*\*Trạng thái\*\* \| )`(?:draft|in-progress|done)`/,
    `$1\`${status}\``,
  ).replace(
    /(^\| Trạng thái \| )`(?:draft|in-progress|done)`( \|)/m,
    `$1\`${status}\`$2`,
  );
}

function findFeatureFile(id) {
  if (!existsSync(FEATURES)) return null;
  const files = readdirSync(FEATURES).filter(
    (f) => f.startsWith(`${id}-`) && f.endsWith('.md') && f !== '_template.md',
  );
  return files.length ? join(FEATURES, files[0]) : null;
}

function findInProgressFeature() {
  if (!existsSync(FEATURES)) return null;
  for (const f of readdirSync(FEATURES)) {
    if (!f.endsWith('.md') || f === '_template.md') continue;
    const path = join(FEATURES, f);
    const text = readFileSync(path, 'utf8');
    if (/`in-progress`/.test(text)) return path;
  }
  return null;
}

function extractFeatureId(path) {
  const base = path.split(/[/\\]/).pop() ?? '';
  const m = base.match(/^(F\d+)/);
  return m ? m[1] : 'F???';
}

function appendChangelog(featureId, dry) {
  const changelogPath = join(DOCS, '04-CHANGELOG.md');
  if (!existsSync(changelogPath)) return;
  const line = `- [Review ${featureId}] Play mode OK — ${new Date().toISOString().slice(0, 10)}`;
  let content = readFileSync(changelogPath, 'utf8');
  if (content.includes(`[Review ${featureId}]`)) {
    console.log(`  skip changelog (review ${featureId} exists)`);
    return;
  }
  const marker = '### Review';
  if (content.includes(marker)) {
    content = content.replace(
      marker,
      `${marker}\n${line}`,
    );
  } else {
    content += `\n${line}\n`;
  }
  if (!dry) writeFileSync(changelogPath, content, 'utf8');
  console.log(`  updated ${changelogPath}`);
}

function updateScenes(featureId, dry) {
  const scenesPath = join(DOCS, '02-SCENES.md');
  if (!existsSync(scenesPath)) return;
  let content = readFileSync(scenesPath, 'utf8');
  const sectionRe = new RegExp(
    `### ${featureId}[\\s\\S]*?(?=\\n### |\\n## |$)`,
  );
  const match = content.match(sectionRe);
  if (match) {
    const updated = tickMarkdownCheckboxes(match[0]);
    content = content.replace(match[0], updated);
    if (!dry) writeFileSync(scenesPath, content, 'utf8');
    console.log(`  updated ${scenesPath} (section ${featureId})`);
  } else {
    console.log(`  skip 02-SCENES (no section ### ${featureId})`);
  }
}

function main() {
  let featurePath = null;
  if (featureArg) {
    featurePath = findFeatureFile(featureArg);
    if (!featurePath) {
      console.error(`Feature not found: ${featureArg}`);
      process.exit(1);
    }
  } else {
    featurePath = findInProgressFeature();
    if (!featurePath) {
      console.error('No in-progress feature. Pass Fxxx or set spec to in-progress.');
      process.exit(1);
    }
  }

  const featureId = extractFeatureId(featurePath);
  console.log(dryRun ? `[dry-run] ${featureId}` : `Review done: ${featureId}`);

  let content = readFileSync(featurePath, 'utf8');
  content = setStatus(content, 'done');
  content = tickMarkdownCheckboxes(content);

  if (!dryRun) writeFileSync(featurePath, content, 'utf8');
  console.log(`  updated ${featurePath}`);

  updateScenes(featureId, dryRun);
  appendChangelog(featureId, dryRun);

  console.log(dryRun ? 'Dry-run complete — no files written.' : 'Done.');
}

main();
