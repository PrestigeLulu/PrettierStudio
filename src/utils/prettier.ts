import * as vscode from 'vscode'
import * as prettier from 'prettier'
import * as fs from 'fs'
import * as path from 'path'
import { PrettierConfig } from '../types'
import { EXAMPLE_CODE } from '../constants'

export async function getPrettierOptions() {
  const prettierOptions = (await prettier.getSupportInfo()).options.filter(
    (opt) => opt.name !== 'parser',
  )
  return prettierOptions
}

export function readPrettierConfig(): PrettierConfig {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath) return {}
  const configPath = path.join(workspacePath, '.prettierrc')
  return fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {}
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
