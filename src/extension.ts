import * as vscode from 'vscode'
import * as prettier from 'prettier'
import * as fs from 'fs'
import * as path from 'path'
import { createStatusBarItem, updateStatusBar } from './utils/statusBar'
import { openSettingsPanel } from './webview/panel'

export function activate(context: vscode.ExtensionContext) {
  const log = vscode.window.createOutputChannel('Prettier Studio')
  log.appendLine('🎉 Prettier Studio Activated!')

  const statusBarItem = createStatusBarItem()
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

function isPrettierConfigFile(fileName: string): boolean {
  return /\.prettierrc(\.json)?|prettier\.config\.js$/i.test(fileName)
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
