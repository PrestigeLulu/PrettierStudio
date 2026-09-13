const { test, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prettier-studio-test-'))
const uri = (fsPath) => ({ scheme: 'file', fsPath, toString: () => fsPath })
const folders = ['first', 'second'].map((name) => {
  const folderPath = path.join(root, name)
  fs.mkdirSync(folderPath)
  const modulePath = path.join(folderPath, 'node_modules', 'prettier')
  fs.mkdirSync(modulePath, { recursive: true })
  fs.writeFileSync(
    path.join(modulePath, 'index.js'),
    `module.exports = {
    getSupportInfo: async () => ({options: [{name: '${name}', type: 'boolean'}]}),
    format: async () => '${name}'
  }`,
  )
  return { uri: uri(folderPath), name }
})
const vscode = {
  Uri: { file: uri },
  workspace: {
    workspaceFolders: folders,
    textDocuments: [],
    getWorkspaceFolder: (documentUri) =>
      folders.find((folder) =>
        documentUri.fsPath.startsWith(folder.uri.fsPath + path.sep),
      ),
  },
  window: {
    activeTextEditor: undefined,
    showWorkspaceFolderPick: async () => undefined,
  },
}
const originalLoad = Module._load
Module._load = function (id, ...args) {
  return id === 'vscode' ? vscode : originalLoad.call(this, id, ...args)
}
const {
  getPrettierTarget,
  getPrettierOptions,
  readPrettierConfig,
  savePrettierConfig,
  formatCode,
} = require('../dist/utils/prettier.js')
Module._load = originalLoad
const log = { appendLine() {} }
let serial = 0
function fixture(config) {
  const folderPath = path.join(root, `case-${serial++}`)
  fs.mkdirSync(folderPath)
  const target = {
    workspacePath: folderPath,
    configPath: path.join(folderPath, '.prettierrc'),
  }
  if (config !== undefined)
    fs.writeFileSync(target.configPath, JSON.stringify(config))
  return target
}
beforeEach(() => {
  vscode.workspace.textDocuments = []
  vscode.window.activeTextEditor = undefined
  vscode.window.showWorkspaceFolderPick = async () => undefined
})
after(() => {
  assert.equal(path.dirname(root), os.tmpdir())
  assert.ok(path.basename(root).startsWith('prettier-studio-test-'))
  fs.rmSync(root, { recursive: true, force: true })
})

test('Apply preserves overrides, plugins, schema, custom options and explicit defaults', async () => {
  const original = {
    overrides: [{ files: '*.md', options: { tabWidth: 4 } }],
    plugins: ['custom-plugin'],
    $schema: 'schema',
    customOption: true,
    semi: true,
  }
  const target = fixture(original)
  const state = await readPrettierConfig(target)
  const saved = savePrettierConfig({ singleQuote: true }, log, state)
  assert.deepEqual(JSON.parse(fs.readFileSync(target.configPath, 'utf8')), {
    ...original,
    singleQuote: true,
  })
  const again = savePrettierConfig({ singleQuote: false }, log, saved)
  assert.equal(again.config.singleQuote, false)
  assert.equal(again.config.semi, true)
})

test('second workspace and nested config remain selected after editor changes', async () => {
  const configPath = path.join(
    folders[1].uri.fsPath,
    'nested',
    '.prettierrc.json',
  )
  vscode.window.activeTextEditor = { document: { uri: uri(configPath) } }
  const target = await getPrettierTarget()
  vscode.window.activeTextEditor = {
    document: { uri: uri(path.join(folders[0].uri.fsPath, '.prettierrc')) },
  }
  assert.deepEqual(target, { workspacePath: folders[1].uri.fsPath, configPath })
  assert.equal((await getPrettierOptions(target))[0].name, 'second')
  assert.equal(await formatCode({}, target), 'second')
})

test('ordinary source file selects its workspace', async () => {
  vscode.window.activeTextEditor = {
    document: { uri: uri(path.join(folders[1].uri.fsPath, 'app.js')) },
  }
  assert.equal((await getPrettierTarget()).workspacePath, folders[1].uri.fsPath)
})

test('multiple folders without active editor require selection; cancellation opens nothing', async () => {
  assert.equal(await getPrettierTarget(), undefined)
  vscode.window.showWorkspaceFolderPick = async () => folders[1]
  assert.equal((await getPrettierTarget()).workspacePath, folders[1].uri.fsPath)
})

test('external modification is rejected without overwriting the file', async () => {
  const target = fixture({ semi: false })
  const state = await readPrettierConfig(target)
  const external = '{"tabWidth": 8}'
  fs.writeFileSync(target.configPath, external)
  assert.throws(
    () => savePrettierConfig({ semi: true }, log, state),
    /변경되거나 삭제/,
  )
  assert.equal(fs.readFileSync(target.configPath, 'utf8'), external)
})

test('dirty editor blocks saving even when disk content is unchanged', async () => {
  const target = fixture({ semi: false })
  const state = await readPrettierConfig(target)
  vscode.workspace.textDocuments = [
    { uri: uri(target.configPath), isDirty: true },
  ]
  assert.throws(
    () => savePrettierConfig({ semi: true }, log, state),
    /저장하지 않은/,
  )
  assert.equal(
    fs.readFileSync(target.configPath, 'utf8'),
    state.originalContent,
  )
})

test('deleted config is not recreated by a stale panel', async () => {
  const target = fixture({})
  const state = await readPrettierConfig(target)
  fs.unlinkSync(target.configPath)
  assert.throws(() => savePrettierConfig({}, log, state), /변경되거나 삭제/)
  assert.equal(fs.existsSync(target.configPath), false)
})

test('new config is created, but concurrent creation is preserved', async () => {
  const target = fixture()
  const first = await readPrettierConfig(target)
  const second = await readPrettierConfig(target)
  savePrettierConfig({ semi: false }, log, first)
  assert.throws(
    () => savePrettierConfig({ semi: true }, log, second),
    /변경되거나 삭제/,
  )
  assert.deepEqual(JSON.parse(fs.readFileSync(target.configPath, 'utf8')), {
    semi: false,
  })
})

test('second panel cannot overwrite first panel changes', async () => {
  const target = fixture({ semi: true })
  const first = await readPrettierConfig(target)
  const second = await readPrettierConfig(target)
  savePrettierConfig({ semi: false }, log, first)
  assert.throws(
    () => savePrettierConfig({ tabWidth: 8 }, log, second),
    /변경되거나 삭제/,
  )
})

test('non-object JSON configs are rejected', async () => {
  for (const value of [null, [], 'shared-config']) {
    await assert.rejects(readPrettierConfig(fixture(value)), /JSON 객체/)
  }
})

test('clearing rangeEnd removes the saved limit and preserves other options', async () => {
  const target = fixture({
    rangeEnd: 100,
    semi: false,
    overrides: [{ files: '*.md', options: { tabWidth: 4 } }],
  })
  const state = await readPrettierConfig(target)
  const saved = savePrettierConfig({ rangeEnd: null }, log, state)
  const disk = JSON.parse(fs.readFileSync(target.configPath, 'utf8'))
  assert.equal(Object.hasOwn(disk, 'rangeEnd'), false)
  assert.equal(Object.hasOwn(saved.config, 'rangeEnd'), false)
  assert.equal(disk.semi, false)
  assert.deepEqual(disk.overrides, state.config.overrides)
})

test('read-only config filenames cannot be saved', () => {
  assert.throws(
    () =>
      savePrettierConfig({}, log, {
        configPath: path.join(root, '.prettierrc.yaml'),
        config: {},
        originalContent: null,
        isWritable: false,
      }),
    /자동 저장을 지원하지 않습니다/,
  )
})
