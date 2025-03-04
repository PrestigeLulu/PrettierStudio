const vscode = acquireVsCodeApi()
let prettierConfig = {}

// 📌 Webview 메시지 처리
window.addEventListener('message', ({ data }) => {
  switch (data.type) {
    case 'loadPrettierConfig':
      console.log('Loaded config:', data.config)
      updateUIWithConfig(data.config)
      break
    case 'loadPrettierOptions':
      generateSettingsUI(data.options)
      break
    case 'formattedCode':
      updateFormattedCode(data.code)
      break
  }
})

// 📌 설정 UI 생성
function generateSettingsUI(options) {
  const settingsContainer = document.getElementById('settings')
  options
    .sort((a, b) => b.type.localeCompare(a.type)) // 옵션 정렬
    .forEach(({ name, type, default: defaultValue, range, choices }) => {
      const label = createLabel(name)
      const input = createInput(type, defaultValue, range, choices)

      if (!input) return
      input.dataset.option = name
      label.appendChild(input)
      settingsContainer.prepend(label)

      input.addEventListener('change', formatCode)
    })
}

// 📌 기존 설정값을 UI에 반영
function updateUIWithConfig(config) {
  prettierConfig = config
  document.querySelectorAll('.prettier-studio-label').forEach((label) => {
    const input = label.querySelector(
      'vscode-checkbox, vscode-text-field, vscode-dropdown',
    )
    if (input && config.hasOwnProperty(input.dataset.option)) {
      setInputValue(input, config[input.dataset.option])
    }
  })
}

// 📌 코드 포맷 요청
function formatCode({ target }) {
  const optionName = target.dataset.option
  if (!optionName) return

  prettierConfig[optionName] = getInputValue(target)
  vscode.postMessage({ type: 'formatCode', config: prettierConfig })
}

// 📌 설정 적용
function applySettings() {
  vscode.postMessage({ type: 'applySettings', config: prettierConfig })
}

// 📌 포맷된 코드 업데이트
function updateFormattedCode(code) {
  const codeBlock = document.getElementById('formattedCode')
  codeBlock.textContent = code
  hljs.highlightElement(codeBlock)
}

// 📌 입력 요소 생성
function createInput(type, defaultValue, range, choices) {
  if (type === 'boolean') {
    const checkbox = document.createElement('vscode-checkbox')
    checkbox.checked = defaultValue
    return checkbox
  }
  if (type === 'int') {
    const textField = document.createElement('vscode-text-field')
    textField.type = 'number'
    textField.value = defaultValue
    textField.min = range?.start || 0
    textField.max = range?.end || 10
    return textField
  }
  if (type === 'choice') {
    const dropdown = document.createElement('vscode-dropdown')
    choices.forEach(({ value }) => {
      const option = document.createElement('vscode-option')
      option.value = value
      option.textContent = value
      dropdown.appendChild(option)
    })
    dropdown.value = defaultValue
    return dropdown
  }
}

// 📌 라벨 생성
function createLabel(text) {
  const label = document.createElement('label')
  label.className = 'prettier-studio-label'
  label.textContent = text
  return label
}

// 📌 입력값 가져오기
function getInputValue(input) {
  if (input.tagName.toLowerCase() === 'vscode-checkbox') return input.checked
  if (input.tagName.toLowerCase() === 'vscode-text-field')
    return parseInt(input.value, 10)
  return input.value
}

// 📌 입력값 설정하기
function setInputValue(input, value) {
  if (input.tagName.toLowerCase() === 'vscode-checkbox') input.checked = value
  else input.value = value
}

// 📌 초기 포맷 요청
vscode.postMessage({ type: 'formatCode', config: prettierConfig })
