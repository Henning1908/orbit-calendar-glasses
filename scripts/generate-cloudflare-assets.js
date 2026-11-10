import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const output = path.join(root, 'src', 'cloudflare-assets.js')
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

async function collect(directory, prefix = '') {
  const files = {}
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name)
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      Object.assign(files, await collect(absolute, relative))
      continue
    }
    const body = await readFile(absolute, 'utf8')
    files[`/${relative}`] = {
      body,
      contentType: contentTypes[path.extname(entry.name)] || 'application/octet-stream',
    }
  }
  return files
}

const assets = await collect(dist)
if (!assets['/index.html'] || !assets['/glasses.html']) {
  throw new Error('The Vite build must contain index.html and glasses.html.')
}
await writeFile(output, `export default ${JSON.stringify(assets)}\n`)
console.log(`Generated ${Object.keys(assets).length} Cloudflare assets.`)

