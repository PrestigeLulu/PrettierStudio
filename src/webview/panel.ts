import * as vscode from 'vscode'
import * as prettier from 'prettier'
import { WebviewMessage } from '../types'
import { getWebviewContent } from './content'
import {
  getPrettierOptions,
  readPrettierConfig,
  savePrettierConfig,
  formatCode,
} from '../utils/prettier'

export async function openSettingsPanel(
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
    const prettierOptions = await getPrettierOptions()
    panel.webview.postMessage({
      type: 'loadPrettierOptions',
      options: prettierOptions,
    } as WebviewMessage)

    panel.webview.postMessage({
      type: 'language',
      language: vscode.env.language,
    } as WebviewMessage)

    panel.webview.postMessage({
      type: 'loadPrettierConfig',
      config: readPrettierConfig(),
    } as WebviewMessage)
  } catch (error) {
    vscode.window.showErrorMessage(
      '❌ Prettier 설정을 가져오는 중 오류 발생: ' + error,
    )
  }

  panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
    if (message.type === 'applySettings' && message.config) {
      const prettierSupportInfo = await prettier.getSupportInfo()
      const filtered = prettierSupportInfo.options.reduce(
        (acc: any, option) => {
          const name = option.name
          if (!name) return acc
          const value = message.config?.[name]
          if (value === undefined || option.default === value) return acc
          acc[name] = value
          return acc
        },
        {},
      )
      savePrettierConfig(filtered, log)
    } else if (message.type === 'formatCode' && message.config) {
      try {
        const formatted = await formatCode(message.config)
        panel.webview.postMessage({
          type: 'formattedCode',
          code: formatted,
        } as WebviewMessage)
      } catch (error) {
        // Error is already handled in formatCode
      }
    }
  })
}
