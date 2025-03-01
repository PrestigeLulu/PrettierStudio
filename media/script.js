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
  if (message.type === 'formattedCode') {
    document.getElementById('formattedCode').textContent = message.code
  }
})

// 설정 UI 생성 함수
function generateSettingsUI(options) {
  const settingsContainer = document.getElementById('settings')

  // 📌 options를 type에 따라 정렬
  options.sort((a, b) => a.type.localeCompare(b.type))

  options.forEach((option) => {
    const label = document.createElement('label')
    label.className = 'prettier-studio-label'
    label.textContent = option.name

    let input
    if (option.type === 'boolean') {
      input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = option.default
    } else if (option.type === 'int') {
      input = document.createElement('input')
      input.type = 'number'
      input.value = option.default
      input.min = option.range ? option.range.start : 0
      input.max = option.range ? option.range.end : 10
    } else if (option.type === 'choice') {
      input = document.createElement('select')
      option.choices.forEach((choice) => {
        const opt = document.createElement('option')
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
    settingsContainer.appendChild(label)
  })

  // Apply 버튼 추가
  const applyButton = document.createElement('button')
  applyButton.textContent = 'Apply Settings'
  applyButton.addEventListener('click', applySettings)
  settingsContainer.appendChild(applyButton)
}

// 설정 변경 적용
function applySettings() {
  const inputs = document.querySelectorAll('#settings input, #settings select')
  inputs.forEach((input) => {
    const optionName = input.dataset.option
    if (input.type === 'checkbox') {
      prettierConfig[optionName] = input.checked
    } else if (input.type === 'number') {
      prettierConfig[optionName] = parseInt(input.value)
    } else {
      prettierConfig[optionName] = input.value
    }
  })

  // 설정을 VS Code 확장으로 전송
  vscode.postMessage({
    type: 'formatCode',
    config: prettierConfig,
  })
}
