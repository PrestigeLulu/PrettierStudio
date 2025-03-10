import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export function getWebviewContent(
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
