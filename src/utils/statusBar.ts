import * as vscode from 'vscode'
import { PRETTIER_CONFIG_PATTERN } from '../constants'

let statusBarItem: vscode.StatusBarItem

export function createStatusBarItem(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  )
  statusBarItem.command = 'prettier-studio.openSettings'
  statusBarItem.text = '⚙️ Prettier Studio'
  statusBarItem.tooltip = 'Prettier 설정 편집'
  statusBarItem.hide()
  return statusBarItem
}

export function updateStatusBar(editor: vscode.TextEditor | undefined) {
  if (editor && isPrettierConfigFile(editor.document.fileName)) {
    statusBarItem.show()
  } else {
    statusBarItem.hide()
  }
}

function isPrettierConfigFile(fileName: string): boolean {
  return PRETTIER_CONFIG_PATTERN.test(fileName)
}
