const vscode = acquireVsCodeApi()

// Prettier 설정 객체 (동적 생성)
let prettierConfig = {}

// Webview가 VS Code 확장에서 받은 메시지를 처리
window.addEventListener('message', (event) => {
  const message = event.data

  // 📌 Prettier 설정 옵션 목록 로드
  if (message.type === 'loadPrettierOptions') {
    generateSettingsUI(message.options)
  }

  // 📌 Prettier 포맷 결과 업데이트
  if (event.data.type === 'formattedCode') {
    const codeBlock = document.getElementById('formattedCode')
    codeBlock.textContent = event.data.code
    hljs.highlightElement(codeBlock) // ✨ 하이라이팅 적용
  }
})

// 설정 UI 생성 함수
function generateSettingsUI(options) {
  const settingsContainer = document.getElementById('settings')

  // 📌 options를 type에 따라 정렬
  options.sort((a, b) => b.type.localeCompare(a.type))

  options.forEach((option) => {
    const label = document.createElement('label')
    label.className = 'prettier-studio-label'
    label.textContent = option.name

    let input
    if (option.type === 'boolean') {
      input = document.createElement('vscode-checkbox')
      input.checked = option.default
    } else if (option.type === 'int') {
      input = document.createElement('vscode-text-field')
      input.type = 'number'
      input.value = option.default
      input.min = option.range ? option.range.start : 0
      input.max = option.range ? option.range.end : 10
    } else if (option.type === 'choice') {
      input = document.createElement('vscode-dropdown')
      option.choices.forEach((choice) => {
        const opt = document.createElement('vscode-option')
        opt.value = choice.value
        opt.textContent = choice.value
        input.appendChild(opt)
      })
      input.value = option.default
    } else {
      return
    }

    input.dataset.option = option.name
    label.appendChild(input)
    settingsContainer.insertBefore(label, settingsContainer.firstChild)

    // 📌 입력값 변경 시 포맷 요청
    input.addEventListener('change', formatCode)
  })
}

function formatCode(event) {
  const input = event.target
  const optionName = input.dataset.option

  if (!optionName) return // 🌟 예외 처리
  const type = input.tagName.toLowerCase()

  if (type === 'vscode-checkbox') {
    prettierConfig[optionName] = input.checked
  } else if (type === 'vscode-text-field') {
    prettierConfig[optionName] = parseInt(input.value, 10)
  } else {
    prettierConfig[optionName] = input.value
  }

  // 📌 설정 변경 후 즉시 포맷 요청
  vscode.postMessage({
    type: 'formatCode',
    config: prettierConfig,
  })
}

function applySettings() {
  vscode.postMessage({
    type: 'applySettings',
    config: prettierConfig,
  })
}
