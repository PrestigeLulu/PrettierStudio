import * as vscode from 'vscode'
import { PrettierConfigState, WebviewMessage } from '../types'
import { getWebviewContent } from './content'
import {
  getPrettierTarget,
  getPrettierOptions,
  readPrettierConfig,
  savePrettierConfig,
  formatCode,
  validateNumericOptions,
} from '../utils/prettier'

export async function openSettingsPanel(
  context: vscode.ExtensionContext,
  log: vscode.OutputChannel,
) {
  let target
  try {
    target = await getPrettierTarget()
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message)
    return
  }
  if (!target) return
  const panelTarget = target
  let prettierOptions: Awaited<ReturnType<typeof getPrettierOptions>> | null =
    null
  let prettierConfigState: PrettierConfigState | null = null

  const panel = vscode.window.createWebviewPanel(
    'prettierStudio',
    'Prettier Studio',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist'),
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

  const postWebviewState = () => {
    if (prettierOptions) {
      panel.webview.postMessage({
        type: 'loadPrettierOptions',
        options: prettierOptions,
      } as WebviewMessage)
    }

    if (prettierConfigState) {
      panel.webview.postMessage({
        type: 'loadPrettierConfig',
        config: prettierConfigState.config,
        configPath: prettierConfigState.configPath,
        isWritable: prettierConfigState.isWritable,
      } as WebviewMessage)
    }
  }

  panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
    if (message.type === 'ready') {
      postWebviewState()
    } else if (message.type === 'applySettings' && message.config) {
      if (!prettierConfigState) return

      try {
        validateNumericOptions(message.config, prettierOptions ?? [])
        prettierConfigState = savePrettierConfig(
          message.config,
          log,
          prettierConfigState,
        )
        panel.webview.postMessage({
          type: 'saveResult',
          level: 'success',
          message: `${prettierConfigState.configPath} 저장 완료`,
        } as WebviewMessage)
      } catch (error: any) {
        panel.webview.postMessage({
          type: 'saveResult',
          level: 'error',
          message: error?.message || '설정 저장 중 오류가 발생했습니다.',
        } as WebviewMessage)
      }
    } else if (message.type === 'formatCode' && message.config) {
      try {
        if (!prettierOptions) return
        validateNumericOptions(message.config, prettierOptions)
        const formatted = await formatCode(
          message.config,
          panelTarget,
          message.language,
        )
        panel.webview.postMessage({
          type: 'formattedCode',
          code: formatted,
          language: message.language,
          requestId: message.requestId,
        } as WebviewMessage)
      } catch (error: any) {
        panel.webview.postMessage({
          type: 'formatError',
          message: error.message,
          requestId: message.requestId,
        })
      }
    }
  })

  try {
    prettierOptions = await getPrettierOptions(panelTarget)
    prettierConfigState = await readPrettierConfig(panelTarget)
    log.appendLine(JSON.stringify(prettierOptions))
    postWebviewState()

    if (!prettierConfigState.isWritable) {
      panel.webview.postMessage({
        type: 'showStatus',
        level: 'warning',
        message:
          '현재 설정 파일은 읽기 전용으로 불러왔습니다. 저장은 .prettierrc 또는 .prettierrc.json에서만 지원합니다.',
      } as WebviewMessage)
    }

    /* panel.webview.postMessage({
      type: 'language',
      language: vscode.env.language,
    } as WebviewMessage) */
  } catch (error: any) {
    const message = `Prettier 설정을 가져오는 중 오류 발생: ${
      error?.message || 'Unknown error'
    }`
    vscode.window.showErrorMessage(`❌ ${message}`)
    panel.webview.postMessage({
      type: 'showStatus',
      level: 'error',
      message,
    } as WebviewMessage)
  }
}
