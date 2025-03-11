import * as vscode from 'vscode'

export interface PrettierConfig {
  [key: string]: any
}

export interface WebviewMessage {
  type:
    | 'loadPrettierOptions'
    | 'loadPrettierConfig'
    | 'applySettings'
    | 'formatCode'
    | 'formattedCode'
  options?: any[]
  config?: PrettierConfig
  code?: string
}
