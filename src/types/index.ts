import * as vscode from 'vscode'

export interface PrettierConfig {
  [key: string]: any
}

export interface WebviewMessage {
  type:
    | 'loadPrettierOptions'
    | 'language'
    | 'loadPrettierConfig'
    | 'applySettings'
    | 'formatCode'
    | 'formattedCode'
  options?: any[]
  config?: PrettierConfig
  language?: string
  code?: string
}
