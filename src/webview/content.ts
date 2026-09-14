import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { randomBytes } from 'crypto'

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
    .replace(/{{highlightUri}}/g, resourceUri('vendor/highlight.min.js'))
    .replace(
      /{{highlightStyleUri}}/g,
      resourceUri('vendor/atom-one-dark.min.css'),
    )
    .replace(/{{nonce}}/g, randomBytes(16).toString('hex'))
    .replace(/{{cspSource}}/g, panel.webview.cspSource)
    .replace(
      /{{toolkitUri}}/g,
      panel.webview
        .asWebviewUri(
          vscode.Uri.joinPath(
            context.extensionUri,
            'dist',
            'toolkit.js',
          ),
        )
        .toString(),
    )
}
