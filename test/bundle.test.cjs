const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')

test('extension bundle opens the panel and formats using workspace Prettier', async () => {
  const root = path.resolve(__dirname, '..')
  const folder = { uri: { scheme: 'file', fsPath: root }, name: 'workspace' }
  const messages = []
  let openSettings
  let receiveMessage
  let panelOptions
  const panel = {
    webview: {
      cspSource: 'https://local-resource.test',
      asWebviewUri: (uri) => uri,
      postMessage: (message) => messages.push(message),
      onDidReceiveMessage: (handler) => {
        receiveMessage = handler
      },
    },
  }
  const vscode = {
    Uri: { joinPath: (base, ...parts) => path.join(base, ...parts) },
    StatusBarAlignment: { Right: 2 },
    ViewColumn: { One: 1 },
    commands: {
      registerCommand: (name, handler) => {
        assert.equal(name, 'prettier-studio.openSettings')
        openSettings = handler
        return { dispose() {} }
      },
    },
    workspace: {
      workspaceFolders: [folder],
      textDocuments: [],
      onDidOpenTextDocument() {},
    },
    window: {
      createOutputChannel: () => ({ appendLine() {} }),
      createStatusBarItem: () => ({ hide() {}, show() {}, dispose() {} }),
      onDidChangeActiveTextEditor() {},
      showErrorMessage: (message) => assert.fail(message),
      createWebviewPanel: (_type, _title, _column, options) => {
        panelOptions = options
        return panel
      },
    },
  }
  const originalLoad = Module._load
  let extension
  try {
    Module._load = function (id, ...args) {
      return id === 'vscode' ? vscode : originalLoad.call(this, id, ...args)
    }
    extension = require('../dist/extension.js')
  } finally {
    Module._load = originalLoad
  }
  extension.activate({
    extensionPath: root,
    extensionUri: root,
    subscriptions: [],
  })
  await openSettings()
  assert.ok(messages.some((message) => message.type === 'loadPrettierOptions'))
  assert.ok(messages.some((message) => message.type === 'loadPrettierConfig'))
  assert.deepEqual(panelOptions.localResourceRoots, [
    path.join(root, 'dist'),
    path.join(root, 'media'),
  ])
  assert.ok(panel.webview.html.includes(path.join(root, 'dist', 'toolkit.js')))
  assert.ok(!panel.webview.html.includes('node_modules'))
  await receiveMessage({
    type: 'formatCode',
    config: {},
    language: 'json',
    requestId: 1,
  })
  const formatted = messages.find((message) => message.type === 'formattedCode')
  assert.equal(formatted?.requestId, 1)
  assert.doesNotThrow(() => JSON.parse(formatted.code))
})
