import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

test('package metadata describes a publishable DSH client bundle', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.name, 'dsh-find-in-conversation');
  assert.equal(pkg.version, '1.0.0');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dsh.client.platform, 'web');
  assert.equal(pkg.dsh.client.immediately, true);
  assert.deepEqual(pkg.dsh.client.inject, [
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-conversation',
  ]);
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(pkg.exports['./client'], './client.js');
  assert.equal(pkg.exports['./icon'], './assets/icon.svg');
  assert.equal(pkg.icon, './assets/icon.svg');
  assert.ok(pkg.files.includes('client.js'));
  assert.ok(pkg.files.includes('LICENSE'));
  assert.ok(pkg.files.includes('locale/*.json'));
});

test('bundle patch references the package name', () => {
  const patch = read('cordis.patch.yml');

  assert.match(patch, /id:\s*dsh-find-in-conversation/);
  assert.match(patch, /name:\s*dsh-find-in-conversation/);
});

test('client bundle is a self-contained module-loader registration', () => {
  const client = read('client.js');

  assert.match(client, /window\.__ModuleLoader__\.load\(/);
  assert.match(client, /id:\s*'dsh-find-in-conversation'/);
  assert.doesNotMatch(client, /@local\//);
  assert.match(client, /#FFFB00/);
  assert.match(client, /#B4D8FD/);
  assert.match(client, /::highlight\(dsh-fic-all\)/);
  assert.doesNotMatch(client, /cfind/);
});

test('locale metadata is present for every supported language', () => {
  for (const locale of ['en', 'zh']) {
    const dict = readJson(`locale/${locale}.json`);
    assert.equal(typeof dict.meta.title, 'string');
    assert.ok(dict.meta.title.length > 0);
    assert.equal(typeof dict.meta.description, 'string');
    assert.ok(dict.meta.description.length > 0);
  }
});

test('plugin icon is a compact original SVG', () => {
  const svg = read('assets/icon.svg');

  assert.ok(Buffer.byteLength(svg) <= 256 * 1024, 'icon must be at most 256 KiB');
  assert.match(svg, /<svg[^>]*viewBox="0 0 36 36"/);
  assert.match(svg, /<rect/);
  assert.match(svg, /<circle/);
  assert.match(svg, /<path/);
  assert.match(svg, /#6DB9FB/);
  assert.match(svg, /#45D9E7/);
  assert.match(svg, /Find in conversation/);
});

test('project carries the MIT license', () => {
  assert.match(read('LICENSE'), /MIT License/);
});
