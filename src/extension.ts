import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'prettier-studio.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello from Prettier Studio!')
    },
  )

  context.subscriptions.push(disposable)
}

export function deactivate() {}
