import * as vscode from 'vscode'

export interface PrettierConfig {
  [key: string]: any
}

export interface PrettierConfigState {
  config: PrettierConfig
  configPath: string
  isWritable: boolean
}

export interface WebviewMessage {
  type:
    | 'ready'
    | 'loadPrettierOptions'
    | 'loadPrettierConfig'
    | 'showStatus'
    | 'applySettings'
    | 'formatCode'
    | 'formattedCode'
    | 'saveResult'
  options?: any[]
  config?: PrettierConfig
  configPath?: string
  code?: string
  isWritable?: boolean
  message?: string
  level?: 'info' | 'success' | 'warning' | 'error'
}
