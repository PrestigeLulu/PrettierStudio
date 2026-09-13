export interface PrettierConfig {
  [key: string]: any
}

export interface PrettierTarget {
  workspacePath: string
  configPath: string
}

export interface PrettierConfigState {
  config: PrettierConfig
  configPath: string
  isWritable: boolean
  originalContent: string | null
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
    | 'formatError'
    | 'saveResult'
  options?: any[]
  config?: PrettierConfig
  configPath?: string
  code?: string
  language?: string
  requestId?: number
  isWritable?: boolean
  message?: string
  level?: 'info' | 'success' | 'warning' | 'error'
}
