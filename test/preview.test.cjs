const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function (id, ...args) {
  if (id === 'vscode')
    return { Uri: { joinPath: (base, ...parts) => path.join(base, ...parts) } }
  return originalLoad.call(this, id, ...args)
}
const {
  formatCode,
  validateNumericOptions,
} = require('../dist/utils/prettier.js')
const { getWebviewContent } = require('../dist/webview/content.js')
Module._load = originalLoad
const { PREVIEW_EXAMPLES } = require('../dist/constants/index.js')
const prettier = require('prettier')
const target = { workspacePath: path.resolve(__dirname, '..') }

test('numeric validation rejects empty, fractional, nonfinite and out-of-range values', () => {
  const options = [
    { name: 'tabWidth', type: 'int', range: { start: 0, end: 8 } },
  ]
  for (const value of ['', null, NaN, Infinity, 2.5, -1, 9, '2']) {
    assert.throws(
      () => validateNumericOptions({ tabWidth: value }, options),
      /tabWidth/,
    )
  }
  for (const value of [0, 2, 8])
    validateNumericOptions({ tabWidth: value }, options)
  validateNumericOptions({ printWidth: 120 }, [
    { name: 'printWidth', type: 'int', range: { start: 0, end: Infinity } },
  ])
})

test('all seven preview languages format with real workspace Prettier and override only preview parser', async () => {
  for (const [language, example] of Object.entries(PREVIEW_EXAMPLES)) {
    const config = { parser: 'invalid-parser', printWidth: 40 }
    const result = await formatCode(config, target, language)
    assert.equal(
      result,
      await prettier.format(example.code, {
        printWidth: 40,
        parser: example.parser,
      }),
    )
    assert.equal(config.parser, 'invalid-parser')
  }
  await assert.rejects(formatCode({}, target, '__proto__'), /지원하지 않는/)
})

test('language-specific formatting options visibly change their examples', async () => {
  for (const [language, first, second] of [
    [
      'markdown',
      { proseWrap: 'always', printWidth: 40 },
      { proseWrap: 'never', printWidth: 40 },
    ],
    [
      'vue',
      { vueIndentScriptAndStyle: true },
      { vueIndentScriptAndStyle: false },
    ],
    [
      'html',
      { singleAttributePerLine: true },
      { singleAttributePerLine: false },
    ],
  ])
    assert.notEqual(
      await formatCode(first, target, language),
      await formatCode(second, target, language),
    )
})

test('webview uses nonce CSP and packaged local scripts with no inline handlers', () => {
  const root = path.resolve(__dirname, '..')
  const html = getWebviewContent(
    { extensionPath: root, extensionUri: root },
    {
      webview: {
        cspSource: 'https://local-resource.test',
        asWebviewUri: (value) => value,
      },
    },
  )
  assert.match(html, /default-src 'none'/)
  assert.doesNotMatch(html, /cdnjs|onclick=|{{/)
  assert.match(html, /atom-one-dark.min.css/)
  for (const match of html.matchAll(/<link[^>]+href="([^"]+)"/g))
    assert.ok(fs.existsSync(match[1]))
  const nonces = [...html.matchAll(/nonce="([a-f0-9]+)"/g)].map(
    (match) => match[1],
  )
  assert.equal(nonces.length, 3)
  assert.equal(new Set(nonces).size, 1)
  assert.match(html, new RegExp(`script-src 'nonce-${nonces[0]}'`))
  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g))
    assert.ok(fs.existsSync(match[1]))
})

function webview() {
  const listeners = {}
  const messages = []
  const elements = {
    applyButton: {},
    previewLanguage: { value: 'markdown' },
    previewStatus: {},
    formattedCode: { dataset: {} },
  }
  const inputs = []
  const context = vm.createContext({
    acquireVsCodeApi: () => ({
      postMessage: (message) => messages.push(structuredClone(message)),
    }),
    window: {
      addEventListener: (name, callback) => {
        listeners[name] = callback
      },
    },
    document: {
      getElementById: (id) => elements[id],
      querySelectorAll: () => inputs,
    },
    console,
  })
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../media/script.js'), 'utf8'),
    context,
  )
  vm.runInContext('configReady = true', context)
  return { context, elements, inputs, listeners, messages }
}

test('invalid numeric UI values block preview and Apply; correcting fields retains other edits', () => {
  const view = webview()
  const input = (name, value) => ({
    tagName: 'INPUT',
    value,
    min: '0',
    max: '',
    dataset: { option: name },
    setAttribute() {},
  })
  view.inputs.push(input('tabWidth', ''), input('printWidth', '120'))
  view.elements['error-tabWidth'] = {}
  view.elements['error-printWidth'] = {}
  view.context.first = view.inputs[0]
  view.context.second = view.inputs[1]
  vm.runInContext(
    'formatCode({target: first}); formatCode({target: second}); applySettings()',
    view.context,
  )
  assert.equal(view.messages.length, 0)
  assert.equal(view.elements.applyButton.disabled, true)
  assert.match(view.elements['error-tabWidth'].textContent, /정수/)
  view.inputs[0].value = '4'
  vm.runInContext('formatCode({target: first}); applySettings()', view.context)
  assert.equal(view.elements.applyButton.disabled, false)
  assert.deepEqual(view.messages[1].config, { tabWidth: 4, printWidth: 120 })
  assert.equal(view.messages[0].language, 'markdown')
  assert.equal(view.messages[1].config.language, undefined)
})

test('stale preview responses are ignored and missing highlighter falls back to plain text', () => {
  const view = webview()
  vm.runInContext('requestFormat(); requestFormat()', view.context)
  view.listeners.message({
    data: {
      type: 'formattedCode',
      requestId: 1,
      code: 'stale',
      language: 'markdown',
    },
  })
  assert.equal(view.elements.formattedCode.textContent, undefined)
  view.listeners.message({
    data: {
      type: 'formattedCode',
      requestId: 2,
      code: '# latest',
      language: 'markdown',
    },
  })
  assert.equal(view.elements.formattedCode.textContent, '# latest')
})

test('rangeEnd is optional and clearing it restores unlimited formatting', async () => {
  const view = webview()
  view.context.document.createElement = () => ({ dataset: {} })
  const input = vm.runInContext(
    "createInput('int', Infinity, {start: 0, end: Infinity}, undefined, 'rangeEnd')",
    view.context,
  )
  assert.equal(input.value, '')
  assert.equal(input.required, false)
  assert.equal(input.placeholder, '제한 없음')
  Object.assign(input, {
    tagName: 'INPUT',
    min: '0',
    max: '',
    dataset: { option: 'rangeEnd' },
    setAttribute() {},
  })
  view.inputs.push(input)
  view.elements['error-rangeEnd'] = {}
  view.context.input = input
  vm.runInContext('requestFormat(); applySettings()', view.context)
  assert.equal(view.elements.applyButton.disabled, false)
  assert.deepEqual(view.messages[1].config, {})
  input.value = '100'
  vm.runInContext('formatCode({target: input})', view.context)
  assert.equal(view.messages.at(-1).config.rangeEnd, 100)
  input.value = ''
  vm.runInContext('formatCode({target: input}); applySettings()', view.context)
  assert.equal(view.messages.at(-1).config.rangeEnd, null)
  assert.equal(view.elements.applyButton.disabled, false)
  validateNumericOptions(
    { rangeEnd: null },
    (await prettier.getSupportInfo()).options,
  )
  assert.equal(
    await formatCode({ rangeEnd: null }, target),
    await formatCode({}, target),
  )
  for (const value of ['-1', '1.5']) {
    input.value = value
    vm.runInContext('formatCode({target: input})', view.context)
    assert.equal(view.elements.applyButton.disabled, true)
  }
})

test('bundled highlighter supports every preview language offline', () => {
  const context = vm.createContext({})
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, '../media/vendor/highlight.min.js'),
      'utf8',
    ),
    context,
  )
  for (const [language, example] of Object.entries(PREVIEW_EXAMPLES)) {
    const name = ['html', 'vue'].includes(language) ? 'xml' : language
    assert.ok(context.hljs.getLanguage(name), name)
    assert.ok(context.hljs.highlight(example.code, { language: name }).value)
  }
})
