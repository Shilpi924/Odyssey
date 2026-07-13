import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
const noticeNames = /^(licen[cs]e|copying|notice)(\.|$)/i;

function repositoryUrl(repository) {
  const value = typeof repository === 'string' ? repository : repository?.url;
  return value?.replace(/^git\+/, '').replace(/\.git$/, '') || null;
}

function normalizeNoticeText(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

const packages = Object.entries(lock.packages || {})
  .filter(([packagePath, metadata]) => packagePath && packagePath.startsWith('node_modules/') && !metadata.dev && !metadata.link)
  .map(([packagePath, metadata]) => {
    const installedPath = join(root, packagePath);
    if (!existsSync(installedPath)) return null;
    const manifestPath = join(installedPath, 'package.json');
    if (!existsSync(manifestPath)) return null;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const notices = readdirSync(installedPath, { withFileTypes: true })
      .filter(entry => entry.isFile() && noticeNames.test(entry.name))
      .map(entry => ({ name: entry.name, text: normalizeNoticeText(readFileSync(join(installedPath, entry.name), 'utf8')) }))
      .filter(entry => entry.text);
    return {
      name: manifest.name || metadata.name || packagePath.replace(/^.*node_modules\//, ''),
      version: manifest.version || metadata.version || 'unknown',
      license: manifest.license || metadata.license || 'SEE PACKAGE',
      repository: repositoryUrl(manifest.repository),
      notices,
    };
  })
  .filter(Boolean)
  .filter((entry, index, all) => all.findIndex(candidate => candidate.name === entry.name && candidate.version === entry.version) === index)
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

const lines = [
  '# Odyssey Third-Party Notices',
  '',
  'This file is generated from the installed production dependency tree. Third-party packages remain subject to their own licenses and notices. No Odyssey license supersedes those terms.',
  '',
  `Packages listed: ${packages.length}`,
  '',
];

for (const entry of packages) {
  lines.push(`## ${entry.name} ${entry.version}`, '', `License: ${entry.license}`);
  if (entry.repository) lines.push(`Repository: ${entry.repository}`);
  if (entry.notices.length) {
    for (const notice of entry.notices) {
      lines.push('', `### ${notice.name}`, '', '```text', notice.text.replaceAll('```', "'''"), '```');
    }
  } else {
    lines.push('', 'No package-level LICENSE, LICENCE, COPYING, or NOTICE file was found in the installed package. Consult the package repository and manifest before redistribution.');
  }
  lines.push('');
}

const output = `${lines.join('\n').trim()}\n`;
const targets = [join(root, 'THIRD_PARTY_NOTICES.md'), join(root, 'public', 'THIRD_PARTY_NOTICES.txt')];

if (checkOnly) {
  const stale = targets.filter(target => !existsSync(target) || readFileSync(target, 'utf8') !== output);
  if (stale.length) {
    console.error(`Third-party notices are stale: ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log(`Third-party notices are current (${packages.length} packages).`);
} else {
  for (const target of targets) writeFileSync(target, output);
  console.log(`Wrote third-party notices for ${packages.length} packages.`);
}
