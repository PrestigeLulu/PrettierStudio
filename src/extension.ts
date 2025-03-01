import * as vscode from 'vscode'
import * as prettier from 'prettier'
import * as fs from 'fs'
import * as path from 'path'

export function activate(context: vscode.ExtensionContext) {
  console.log('🎉 Prettier Studio Activated!')

  // 📌 Status Bar 버튼 생성
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  )
  statusBarItem.command = 'prettier-studio.openSettings'
  statusBarItem.text = '⚙️ Prettier Studio'
  statusBarItem.tooltip = 'Prettier 설정 편집'
  statusBarItem.hide() // 처음에는 숨김

  // 📌 Prettier 설정 파일 여부 확인 함수
  function updateStatusBar(editor: vscode.TextEditor | undefined) {
    if (editor && isPrettierConfigFile(editor.document.fileName)) {
      statusBarItem.show()
    } else {
      statusBarItem.hide()
    }
  }

  function isPrettierConfigFile(fileName: string): boolean {
    return /(\.prettierrc|\.prettierrc\.json|prettier\.config\.js)$/i.test(
      fileName,
    )
  }

  // 📌 현재 활성화된 편집기에 따라 상태 업데이트
  updateStatusBar(vscode.window.activeTextEditor)
  vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  vscode.workspace.onDidOpenTextDocument(() =>
    updateStatusBar(vscode.window.activeTextEditor),
  )

  let disposable = vscode.commands.registerCommand(
    'prettier-studio.openSettings',
    async () => {
      const panel = vscode.window.createWebviewPanel(
        'prettierStudio',
        'Prettier Studio',
        vscode.ViewColumn.One,
        { enableScripts: true },
      )
      const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'styles.css'),
      )
      const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'script.js'),
      )
      const toolkitUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(
          context.extensionUri,
          'node_modules',
          '@vscode/webview-ui-toolkit',
          'dist',
          'toolkit.js',
        ),
      )

      const indexPath = path.join(context.extensionPath, 'media', 'index.html')
      let htmlContent = fs.readFileSync(indexPath, 'utf8')

      htmlContent = htmlContent.replace(/{{styleUri}}/g, styleUri.toString())
      htmlContent = htmlContent.replace(/{{scriptUri}}/g, scriptUri.toString())
      htmlContent = htmlContent.replace(
        /{{toolkitUri}}/g,
        toolkitUri.toString(),
      )

      panel.webview.html = htmlContent

      try {
        const prettierSupportInfo = await prettier.getSupportInfo()
        const prettierOptions = prettierSupportInfo.options

        console.log('✅ Prettier 지원 설정 목록:', prettierOptions)

        panel.webview.postMessage({
          type: 'loadPrettierOptions',
          options: prettierOptions,
        })
      } catch (error) {
        vscode.window.showErrorMessage(
          '❌ Prettier 설정을 가져오는 중 오류 발생: ' + error,
        )
      }

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'formatCode') {
          try {
            const exampleCode = `function helloWorld() {
  console.log("Hello, world!");
}`

            const formatted = await prettier.format(exampleCode, {
              parser: 'babel',
              ...message.config,
            })

            panel.webview.postMessage({
              type: 'formattedCode',
              code: formatted,
            })
          } catch (error) {
            vscode.window.showErrorMessage(
              'Prettier formatting error: ' + error,
            )
          }
        }
      })
    },
  )

  context.subscriptions.push(disposable)
  context.subscriptions.push(statusBarItem)
}
