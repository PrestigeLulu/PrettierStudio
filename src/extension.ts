import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('🎉 Prettier Studio Activated!')

  // 상태 표시줄(Status Bar) 버튼 생성
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  )
  statusBarItem.command = 'prettier-studio.openSettings'
  statusBarItem.text = '⚙️ Prettier Studio'
  statusBarItem.tooltip = 'Prettier 설정 편집'
  statusBarItem.hide() // 기본적으로 숨김

  function updateStatusBar(editor: vscode.TextEditor | undefined) {
    if (editor && isPrettierConfigFile(editor.document.fileName)) {
      statusBarItem.show() // Prettier 설정 파일이면 버튼 표시
    } else {
      statusBarItem.hide() // 아니면 버튼 숨김
    }
  }

  function isPrettierConfigFile(fileName: string): boolean {
    return /(\.prettierrc|\.prettierrc\.json|prettier\.config\.js)$/i.test(
      fileName,
    )
  }

  // VS Code 실행 직후 현재 열린 파일 체크
  updateStatusBar(vscode.window.activeTextEditor)

  // 파일이 변경될 때 감지하여 업데이트
  vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  vscode.workspace.onDidOpenTextDocument(() =>
    updateStatusBar(vscode.window.activeTextEditor),
  )

  // 버튼 클릭 시 Webview 열기
  let disposable = vscode.commands.registerCommand(
    'prettier-studio.openSettings',
    () => {
      openPrettierSettingsPanel()
    },
  )

  context.subscriptions.push(disposable)
  context.subscriptions.push(statusBarItem)
}

function openPrettierSettingsPanel() {
  const panel = vscode.window.createWebviewPanel(
    'prettierStudio',
    'Prettier Studio',
    vscode.ViewColumn.One,
    { enableScripts: true },
  )

  panel.webview.html = getWebviewContent()
}

function getWebviewContent() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prettier Studio</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #007acc; }
            button { padding: 10px; font-size: 16px; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>Prettier Studio Settings</h1>
        <button onclick="saveSettings()">Save</button>
        <script>
            function saveSettings() {
                alert('Settings saved!');
            }
        </script>
    </body>
    </html>
    `
}

export function deactivate() {}
