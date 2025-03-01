import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {
  console.log('🎉 Prettier Studio Activated!')

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  )
  statusBarItem.command = 'prettier-studio.openSettings'
  statusBarItem.text = '⚙️ Prettier Studio'
  statusBarItem.tooltip = 'Prettier 설정 편집'
  statusBarItem.hide()

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

      // media 폴더에 있는 파일들의 Webview URI 생성
      const mediaPath = vscode.Uri.file(
        path.join(context.extensionPath, 'media'),
      )
      const mediaUri = panel.webview.asWebviewUri(mediaPath)

      // HTML 파일을 읽어서 Webview에 로드
      const indexPath = path.join(context.extensionPath, 'media', 'index.html')
      let htmlContent = fs.readFileSync(indexPath, 'utf8')

      // Webview에서 로드할 파일들의 URL을 변환
      htmlContent = htmlContent.replace(
        /{{styleUri}}/g,
        panel.webview
          .asWebviewUri(
            vscode.Uri.file(
              path.join(context.extensionPath, 'media', 'style.css'),
            ),
          )
          .toString(),
      )
      htmlContent = htmlContent.replace(
        /{{scriptUri}}/g,
        panel.webview
          .asWebviewUri(
            vscode.Uri.file(
              path.join(context.extensionPath, 'media', 'script.js'),
            ),
          )
          .toString(),
      )

      panel.webview.html = htmlContent
    },
  )

  context.subscriptions.push(disposable)
  context.subscriptions.push(statusBarItem)
}
