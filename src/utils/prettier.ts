import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import { PrettierConfig, PrettierConfigState } from '../types'
import { EXAMPLE_CODE, PRETTIER_CONFIG_PATTERN } from '../constants'

const extensionRequire = createRequire(__filename)
const WRITABLE_CONFIG_FILE_NAMES = new Set(['.prettierrc', '.prettierrc.json'])
const PRETTIER_CONFIG_FILE_NAMES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'prettier.config.ts',
]

async function getPrettier() {
  const workspacePath = getWorkspacePath()

  try {
    const prettierPath = extensionRequire.resolve('prettier', {
      paths: [workspacePath],
    })
    const prettierModule = await import(pathToFileURL(prettierPath).href)
    return prettierModule.default ?? prettierModule
  } catch (error: any) {
    throw new Error(
      `Workspace Prettier를 찾을 수 없습니다. 이 프로젝트에 Prettier를 설치해주세요. (${error.message})`,
    )
  }
}

function getWorkspacePath() {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath) {
    throw new Error('워크스페이스가 열려 있지 않습니다.')
  }
  return workspacePath
}

function isInsideWorkspace(filePath: string, workspacePath: string) {
  const relativePath = path.relative(workspacePath, filePath)
  return (
    relativePath &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  )
}

function getActiveConfigPath(workspacePath: string) {
  const activeDocument = vscode.window.activeTextEditor?.document
  if (!activeDocument || activeDocument.uri.scheme !== 'file') return null

  const filePath = activeDocument.uri.fsPath
  if (!isInsideWorkspace(filePath, workspacePath)) return null
  return PRETTIER_CONFIG_PATTERN.test(filePath) ? filePath : null
}

function findWorkspaceConfigPath(workspacePath: string) {
  const activeConfigPath = getActiveConfigPath(workspacePath)
  if (activeConfigPath) return activeConfigPath

  for (const fileName of PRETTIER_CONFIG_FILE_NAMES) {
    const configPath = path.join(workspacePath, fileName)
    if (fs.existsSync(configPath)) return configPath
  }

  return path.join(workspacePath, '.prettierrc')
}

function isWritableConfigPath(configPath: string) {
  return WRITABLE_CONFIG_FILE_NAMES.has(path.basename(configPath))
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
      (opt: any) => opt.name && opt.name !== 'parser',
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

export async function readPrettierConfig(): Promise<PrettierConfigState> {
  const workspacePath = getWorkspacePath()
  const configPath = findWorkspaceConfigPath(workspacePath)
  const isWritable = isWritableConfigPath(configPath)

  if (!fs.existsSync(configPath)) {
    return { config: {}, configPath, isWritable }
  }

  if (!isWritable) {
    const prettier = await getPrettier()
    const config = (await prettier.resolveConfig(configPath)) ?? {}
    return { config, configPath, isWritable }
  }

  const configFile = fs.readFileSync(configPath, 'utf8')
  if (!configFile.trim()) {
    return { config: {}, configPath, isWritable }
  }

  try {
    return { config: JSON.parse(configFile), configPath, isWritable }
  } catch (error: any) {
    throw new Error(
      `${path.basename(configPath)} 파일이 올바른 JSON이 아닙니다: ${error.message}`,
    )
  }
}

export function savePrettierConfig(
  config: PrettierConfig,
  log: vscode.OutputChannel,
  configPath: string,
) {
  if (!isWritableConfigPath(configPath)) {
    throw new Error(
      `${path.basename(configPath)} 파일은 자동 저장을 지원하지 않습니다. 현재는 .prettierrc 또는 .prettierrc.json만 저장할 수 있습니다.`,
    )
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
    log.appendLine(`Saved Prettier config: ${configPath}`)
  } catch (err) {
    throw new Error('설정 저장 중 오류 발생: ' + err)
  }
}

export async function getConfigWithNonDefaultOptions(config: PrettierConfig) {
  const prettier = await getPrettier()
  const prettierSupportInfo = await prettier.getSupportInfo()
  return prettierSupportInfo.options.reduce(
    (acc: PrettierConfig, option: any) => {
      const name = option.name
      if (!name) return acc
      const value = config[name]
      if (value === undefined || option.default === value) return acc
      acc[name] = value
      return acc
    },
    {},
  )
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
