import * as vscode from 'vscode'
import * as prettier from 'prettier'
import * as fs from 'fs'
import * as path from 'path'
import hljs from 'highlight.js'

export function activate(context: vscode.ExtensionContext) {
  const log = vscode.window.createOutputChannel('Prettier Studio')
  log.appendLine('🎉 Prettier Studio Activated!')

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
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, 'node_modules'),
            vscode.Uri.joinPath(context.extensionUri, 'media'),
          ],
        },
      )
      const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'style.css'),
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
      // COMMENT: 왜인지 불러오지를 못하므로 그냥 cdn에서 가져오는 방식으로 바꿔둠
      /* const highlightJsUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(
          context.extensionUri,
          'node_modules',
          'highlight.js',
          'lib',
          'index.js',
        ),
      ) */

      const indexPath = path.join(context.extensionPath, 'media', 'index.html')
      let htmlContent = fs.readFileSync(indexPath, 'utf8')

      htmlContent = htmlContent.replace(/{{styleUri}}/g, styleUri.toString())
      htmlContent = htmlContent.replace(/{{scriptUri}}/g, scriptUri.toString())
      htmlContent = htmlContent.replace(
        /{{toolkitUri}}/g,
        toolkitUri.toString(),
      )
      /* htmlContent = htmlContent.replace(
        /{{highlightJsUri}}/g,
        highlightJsUri.toString(),
      ) */

      panel.webview.html = htmlContent

      try {
        const prettierSupportInfo = await prettier.getSupportInfo()
        const prettierOptions = prettierSupportInfo.options

        panel.webview.postMessage({
          type: 'loadPrettierOptions',
          options: prettierOptions,
        })
        panel.webview.postMessage({
          type: 'language',
          language: vscode.env.language,
        })
      } catch (error) {
        vscode.window.showErrorMessage(
          '❌ Prettier 설정을 가져오는 중 오류 발생: ' + error,
        )
      }

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'applySettings') {
          // Prettier 지원 옵션 정보 가져오기
          const prettierSupportInfo = await prettier.getSupportInfo()
          // 기본 설정과 비교하여 사용자 지정된 값만 필터링
          const filtered = prettierSupportInfo.options.reduce(
            (acc: any, option) => {
              const name = option.name
              if (!name) return acc
              // value가 undefined가 아니고, 기본값과 다른 경우에만 저장
              const value = message.config[name]
              if (value === undefined || option.default === value) return acc
              acc[name] = value
              return acc
            },
            {},
          )

          // 로그에 필터링된 결과 출력 (디버깅용)
          log.appendLine(
            '✅ 사용자 지정 Prettier 설정: ' +
              JSON.stringify(filtered, null, 2),
          )

          // 워크스페이스에서 .prettierrc 파일 저장 (JSON 형식)
          const workspaceFolders = vscode.workspace.workspaceFolders
          if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('워크스페이스가 열려 있지 않습니다.')
            return
          }
          const workspacePath = workspaceFolders[0].uri.fsPath
          const configPath = path.join(workspacePath, '.prettierrc')
          try {
            fs.writeFileSync(
              configPath,
              JSON.stringify(filtered, null, 2) + '\n',
              'utf8',
            )
            vscode.window.showInformationMessage(
              '.prettierrc 파일이 성공적으로 저장되었습니다.',
            )
          } catch (err) {
            vscode.window.showErrorMessage('설정 저장 중 오류 발생: ' + err)
          }
        } else if (message.type === 'formatCode') {
          try {
            const example = `
/** @format */
// (requirePragma가 true이면 위 @format 주석이 있어야 함)

const compute = (a, b) =>
  a > b
    ? a - b
    : a < b
    ? b - a
    : 0;

const person = {
  name: "Alice",
  hobbies: ["reading", "coding", "traveling"],
  address: {
    city: "Wonderland",
    zip: "12345",
  },
  spacing: { a:1 }
};

const UserCard = (person) => (
  <div id="user-card" className="card" data-active={true}>
    <h2>{person.firstName + " " + person.lastName}</h2>
    <p>{\`Age: \${person.age}\`}</p>
    <p> 1<b> 2 </b>3  </p>
  </div>
);

const markdownText = \`
# Sample Markdown Title
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
\`;

function notFormatted() {
  const messyArray = [  1,2,  3,4,5 ];
  return messyArray;
}

console.log(
  compute(10, 5),
  person,
  htmlSnippet,
  vueComponent,
  markdownText,
  notFormatted()
);
`

            const formatted = await prettier.format(example, {
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
