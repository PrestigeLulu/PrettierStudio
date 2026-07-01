const vscode = acquireVsCodeApi()
let prettierConfig = {}
let optionTooltip
let configIsWritable = true

window.addEventListener('DOMContentLoaded', () => {
  initOptionTooltip()
  initResizablePanels()
  vscode.postMessage({ type: 'ready' })
})

// 📌 Webview 메시지 처리
window.addEventListener('message', ({ data }) => {
  switch (data.type) {
    case 'loadPrettierConfig':
      console.log('Loaded config:', data.config)
      updateUIWithConfig(data.config)
      updateConfigState(data.configPath, data.isWritable)
      requestFormat()
      break
    case 'showStatus':
      showStatus(data.message, data.level)
      break
    case 'loadPrettierOptions':
      generateSettingsUI(data.options)
      break
    case 'formattedCode':
      updateFormattedCode(data.code)
      break
    case 'saveResult':
      showStatus(data.message, data.level)
      break
  }
})

// 📌 설정 UI 생성
function generateSettingsUI(options) {
  const settingsContainer = document.getElementById('settings')
  document
    .querySelectorAll('.prettier-studio-label')
    .forEach((label) => label.remove())

  options
    .sort((a, b) => b.type.localeCompare(a.type)) // 옵션 정렬
    .forEach(
      ({ name, type, default: defaultValue, range, choices, description }) => {
        const label = createLabel(name)
        const input = createInput(type, defaultValue, range, choices)

        if (!input) return
        const hint = getOptionHint(name, description)
        if (hint) {
          label.dataset.hint = hint
          label.addEventListener('mouseenter', () => showOptionTooltip(label))
          label.addEventListener('mouseleave', hideOptionTooltip)
          label.addEventListener('focusin', () => showOptionTooltip(label))
          label.addEventListener('focusout', hideOptionTooltip)
        }
        input.dataset.option = name
        label.appendChild(input)
        settingsContainer.prepend(label)

        input.addEventListener('change', formatCode)
      },
    )
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

function updateConfigState(configPath, isWritable) {
  configIsWritable = isWritable !== false

  const applyButton = document.getElementById('applyButton')
  if (applyButton) applyButton.disabled = !configIsWritable

  const fileName = configPath ? getFileName(configPath) : '.prettierrc'
  showStatus(
    configIsWritable
      ? `${fileName} 설정을 편집 중입니다.`
      : `${fileName} 설정을 읽기 전용으로 불러왔습니다.`,
    configIsWritable ? 'info' : 'warning',
  )
}

// 📌 코드 포맷 요청
function formatCode({ target }) {
  const optionName = target.dataset.option
  if (!optionName) return

  prettierConfig[optionName] = getInputValue(target)
  requestFormat()
}

function requestFormat() {
  vscode.postMessage({ type: 'formatCode', config: prettierConfig })
}

// 📌 설정 적용
function applySettings() {
  if (!configIsWritable) {
    showStatus(
      '현재 설정 파일은 자동 저장을 지원하지 않습니다. .prettierrc 또는 .prettierrc.json을 열어주세요.',
      'warning',
    )
    return
  }
  vscode.postMessage({ type: 'applySettings', config: prettierConfig })
}

function showStatus(message, level = 'info') {
  const status = document.getElementById('configStatus')
  if (!status || !message) return

  status.textContent = message
  status.dataset.level = level
}

function getFileName(filePath) {
  return filePath.split(/[\\/]/).pop()
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

function getOptionHint(name, description) {
  const hints = {
    printWidth:
      '한 줄에 유지하려는 최대 길이입니다. 이 길이를 넘으면 Prettier가 줄바꿈을 시도합니다.',
    tabWidth: '들여쓰기 한 단계에 사용할 공백 수입니다.',
    useTabs: '공백 대신 탭 문자로 들여쓰기합니다.',
    semi: '문장 끝에 세미콜론을 붙일지 정합니다.',
    singleQuote: '문자열에 큰따옴표 대신 작은따옴표를 우선 사용합니다.',
    quoteProps: '객체 속성 이름에 따옴표를 붙이는 방식을 정합니다.',
    jsxSingleQuote:
      'JSX 속성에서도 큰따옴표 대신 작은따옴표를 우선 사용합니다.',
    trailingComma:
      '여러 줄 객체, 배열, 함수 인자 등에 마지막 쉼표를 붙이는 방식을 정합니다.',
    bracketSpacing: '객체 리터럴의 중괄호 안쪽에 공백을 둘지 정합니다.',
    bracketSameLine:
      'HTML, JSX, Vue 등에서 여러 줄 태그의 닫는 꺾쇠를 마지막 속성 줄에 둘지 정합니다.',
    arrowParens: '화살표 함수의 매개변수가 하나일 때 괄호를 붙일지 정합니다.',
    rangeStart:
      '파일 전체가 아니라 일부 범위만 포맷할 때 시작 위치를 지정합니다.',
    rangeEnd: '파일 전체가 아니라 일부 범위만 포맷할 때 끝 위치를 지정합니다.',
    requirePragma:
      '이 옵션을 활성화하면 Prettier는 파일 맨 위에 pragma가 포함된 파일만 포맷합니다.',
    insertPragma:
      '이 옵션을 활성화하면 Prettier가 파일을 포맷할 때 파일 맨 위에 pragma 주석을 자동으로 삽입합니다.',
    checkIgnorePragma:
      '특정 ignore pragma가 있는 경우 개별 파일이 포맷팅을 거부하도록 허용합니다.',
    proseWrap:
      'Markdown 같은 prose 문서에서 긴 문장을 줄바꿈하는 방식을 정합니다.',
    htmlWhitespaceSensitivity:
      'HTML 공백을 CSS display 규칙에 얼마나 민감하게 처리할지 정합니다.',
    vueIndentScriptAndStyle:
      'Vue 파일의 script와 style 블록 내부를 들여쓸지 정합니다.',
    endOfLine: '줄 끝 문자를 LF, CRLF 등 어떤 방식으로 맞출지 정합니다.',
    embeddedLanguageFormatting:
      'Markdown, HTML 등에 포함된 코드 블록도 함께 포맷할지 정합니다.',
    singleAttributePerLine:
      'HTML, Vue, JSX에서 여러 속성을 각각 한 줄에 하나씩 배치할지 정합니다.',
    objectWrap: '객체 리터럴을 한 줄 또는 여러 줄로 유지하는 방식을 정합니다.',
  }

  return (
    hints[name] ||
    (description
      ? `Prettier가 제공하는 ${name} 옵션입니다. 현재 값에 따라 포맷 결과가 달라질 수 있습니다.`
      : '')
  )
}

function initOptionTooltip() {
  optionTooltip = document.createElement('div')
  optionTooltip.className = 'option-tooltip'
  optionTooltip.setAttribute('role', 'tooltip')
  document.body.appendChild(optionTooltip)
}

function showOptionTooltip(label) {
  if (!optionTooltip || !label.dataset.hint) return

  optionTooltip.textContent = label.dataset.hint
  optionTooltip.classList.add('visible')

  const labelRect = label.getBoundingClientRect()
  const tooltipRect = optionTooltip.getBoundingClientRect()
  const gap = 8
  const left = Math.min(
    labelRect.right + gap,
    window.innerWidth - tooltipRect.width - gap,
  )
  const top = Math.min(
    labelRect.top,
    window.innerHeight - tooltipRect.height - gap,
  )

  optionTooltip.style.left = `${Math.max(gap, left)}px`
  optionTooltip.style.top = `${Math.max(gap, top)}px`
}

function hideOptionTooltip() {
  if (!optionTooltip) return
  optionTooltip.classList.remove('visible')
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

function initResizablePanels() {
  const container = document.querySelector('.container')
  const handle = document.getElementById('resizeHandle')
  if (!container || !handle) return

  let resizeOffset = 0

  const setSettingsWidth = (clientX) => {
    const rect = container.getBoundingClientRect()
    const minWidth = 240
    const maxWidth = rect.width * 0.7
    const width = Math.min(
      Math.max(clientX - rect.left - resizeOffset, minWidth),
      maxWidth,
    )
    container.style.setProperty('--settings-width', `${width}px`)
  }

  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    resizeOffset = event.clientX - handle.getBoundingClientRect().left
    container.classList.add('resizing')
    handle.setPointerCapture(event.pointerId)
  })

  handle.addEventListener('pointermove', (event) => {
    if (!container.classList.contains('resizing')) return
    setSettingsWidth(event.clientX)
  })

  const stopResizing = (event) => {
    container.classList.remove('resizing')
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId)
    }
  }

  handle.addEventListener('pointerup', stopResizing)
  handle.addEventListener('pointercancel', stopResizing)
}
