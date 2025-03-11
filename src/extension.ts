import * as vscode from 'vscode'
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
