import * as vscode from 'vscode'
import * as prettier from 'prettier'
import * as fs from 'fs'
import * as path from 'path'

let statusBarItem = createStatusBarItem()
export function activate(context: vscode.ExtensionContext) {
  const log = vscode.window.createOutputChannel('Prettier Studio')
  log.appendLine('🎉 Prettier Studio Activated!')

  updateStatusBar(vscode.window.activeTextEditor)
  vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  vscode.workspace.onDidOpenTextDocument(() =>
    updateStatusBar(vscode.window.activeTextEditor),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('prettier-studio.openSettings', () =>
      openSettingsPanel(context, log),
    ),
    statusBarItem,
  )
}

function createStatusBarItem() {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  )
  statusBarItem.command = 'prettier-studio.openSettings'
  statusBarItem.text = '⚙️ Prettier Studio'
  statusBarItem.tooltip = 'Prettier 설정 편집'
  statusBarItem.hide()
  return statusBarItem
}

function updateStatusBar(editor: vscode.TextEditor | undefined) {
  if (editor && isPrettierConfigFile(editor.document.fileName)) {
    statusBarItem.show()
  } else {
    statusBarItem.hide()
  }
}

function isPrettierConfigFile(fileName: string): boolean {
  return /\.prettierrc(\.json)?|prettier\.config\.js$/i.test(fileName)
}

async function openSettingsPanel(
  context: vscode.ExtensionContext,
  log: vscode.OutputChannel,
) {
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
  panel.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    'media',
    'image.png',
  )

  panel.webview.html = getWebviewContent(context, panel)

  try {
    const prettierOptions = (await prettier.getSupportInfo()).options.filter(
      (opt) => opt.name !== 'parser',
    )
    panel.webview.postMessage({
      type: 'loadPrettierOptions',
      options: prettierOptions,
    })
    panel.webview.postMessage({
      type: 'language',
      language: vscode.env.language,
    })
    panel.webview.postMessage({
      type: 'loadPrettierConfig',
      config: readPrettierConfig(),
    })
  } catch (error) {
    vscode.window.showErrorMessage(
      '❌ Prettier 설정을 가져오는 중 오류 발생: ' + error,
    )
  }

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === 'applySettings') {
      const prettierSupportInfo = await prettier.getSupportInfo()
      const filtered = prettierSupportInfo.options.reduce(
        (acc: any, option) => {
          const name = option.name
          if (!name) return acc
          const value = message.config[name]
          if (value === undefined || option.default === value) return acc
          acc[name] = value
          return acc
        },
        {},
      )
      savePrettierConfig(filtered, log)
    } else if (message.type === 'formatCode') {
      formatCode(panel, message.config)
    }
  })
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
) {
  const resourceUri = (filename: string) =>
    panel.webview
      .asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', filename),
      )
      .toString()
  return fs
    .readFileSync(
      path.join(context.extensionPath, 'media', 'index.html'),
      'utf8',
    )
    .replace(/{{styleUri}}/g, resourceUri('style.css'))
    .replace(/{{scriptUri}}/g, resourceUri('script.js'))
    .replace(
      /{{toolkitUri}}/g,
      panel.webview
        .asWebviewUri(
          vscode.Uri.joinPath(
            context.extensionUri,
            'node_modules',
            '@vscode/webview-ui-toolkit',
            'dist',
            'toolkit.js',
          ),
        )
        .toString(),
    )
}

function readPrettierConfig() {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath) return {}
  const configPath = path.join(workspacePath, '.prettierrc')
  return fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {}
}

function savePrettierConfig(config: any, log: vscode.OutputChannel) {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath)
    return vscode.window.showErrorMessage('워크스페이스가 열려 있지 않습니다.')

  const configPath = path.join(workspacePath, '.prettierrc')
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
    vscode.window.showInformationMessage(
      '.prettierrc 파일이 성공적으로 저장되었습니다.',
    )
  } catch (err) {
    vscode.window.showErrorMessage('설정 저장 중 오류 발생: ' + err)
  }
}

async function formatCode(panel: vscode.WebviewPanel, config: any) {
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
  try {
    const formatted = await prettier.format(example, {
      parser: 'babel',
      ...config,
    })
    panel.webview.postMessage({ type: 'formattedCode', code: formatted })
  } catch (error) {
    vscode.window.showErrorMessage('Prettier formatting error: ' + error)
  }
}
