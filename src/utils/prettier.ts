import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { PrettierConfig } from '../types'
import { EXAMPLE_CODE } from '../constants'

async function getPrettier() {
  return await import('prettier')
}

export async function getPrettierOptions() {
  try {
    const prettier = await getPrettier()
    const supportInfo = await prettier.getSupportInfo()
    if (!supportInfo || !supportInfo.options) {
      throw new Error(
        `Prettier support info is undefined: ${JSON.stringify(supportInfo)}`,
      )
    }
    const prettierOptions = supportInfo.options.filter(
      (opt) => opt.name && opt.name !== 'parser',
    )
    if (!prettierOptions) {
      throw new Error(
        `Prettier options is undefined: ${JSON.stringify(prettierOptions)}`,
      )
    }
    return prettierOptions
  } catch (error: any) {
    console.error('Prettier options error:', error)
    throw error
  }
}

export function readPrettierConfig(): PrettierConfig {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath) {
    throw new Error('Workspace path is undefined: ' + workspacePath)
  }
  const configPath = path.join(workspacePath, '.prettierrc')
  if (!configPath) {
    throw new Error('Config path is undefined: ' + configPath)
  }
  if (!fs.existsSync(configPath)) {
    throw new Error('Config file does not exist: ' + configPath)
  }
  const configFile = fs.readFileSync(configPath, 'utf8')
  try {
    return JSON.parse(configFile)
  } catch (error: any) {
    throw new Error('Config file is not valid JSON: ' + error.message)
  }
}

export function savePrettierConfig(
  config: PrettierConfig,
  log: vscode.OutputChannel,
) {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath)
    return vscode.window.showErrorMessage('워크스페이스가 열려 있지 않습니다.')

  const configPath = path.join(workspacePath, '.prettierrc')
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
    vscode.window.showInformationMessage(
      '.prettierrc 파일이 성공적으로 저장되었습니다.',
    )
  } catch (err) {
    vscode.window.showErrorMessage('설정 저장 중 오류 발생: ' + err)
  }
}

export async function formatCode(config: PrettierConfig): Promise<string> {
  try {
    const prettier = await getPrettier()
    const formatted = await prettier.format(EXAMPLE_CODE, {
      parser: 'babel',
      ...config,
    })
    return formatted
  } catch (error) {
    vscode.window.showErrorMessage('Prettier formatting error: ' + error)
    throw error
  }
}
