import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import { PrettierConfig, PrettierConfigState, PrettierTarget } from '../types'
import { PREVIEW_EXAMPLES, PRETTIER_CONFIG_PATTERN } from '../constants'

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

async function getPrettier(workspacePath: string) {
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

export async function getPrettierTarget(): Promise<PrettierTarget | undefined> {
  // Capture the editor before creating a webview or awaiting a folder picker.
  const document = vscode.window.activeTextEditor?.document
  const folders = vscode.workspace.workspaceFolders
  if (!folders?.length) {
    throw new Error('워크스페이스가 열려 있지 않습니다.')
  }
  const activeFolder = document
    ? vscode.workspace.getWorkspaceFolder(document.uri)
    : undefined
  const folder =
    activeFolder ??
    (folders.length === 1
      ? folders[0]
      : await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Prettier 설정을 편집할 프로젝트를 선택하세요.',
        }))
  if (!folder) return undefined
  if (folder.uri.scheme !== 'file') {
    throw new Error('파일 시스템 워크스페이스만 지원합니다.')
  }
  const workspacePath = folder.uri.fsPath
  const configPath =
    activeFolder === folder &&
    document?.uri.scheme === 'file' &&
    PRETTIER_CONFIG_PATTERN.test(document.uri.fsPath)
      ? document.uri.fsPath
      : findWorkspaceConfigPath(workspacePath)
  return { workspacePath, configPath }
}

function findWorkspaceConfigPath(workspacePath: string) {
  for (const fileName of PRETTIER_CONFIG_FILE_NAMES) {
    const configPath = path.join(workspacePath, fileName)
    if (fs.existsSync(configPath)) return configPath
  }

  return path.join(workspacePath, '.prettierrc')
}

function isWritableConfigPath(configPath: string) {
  return WRITABLE_CONFIG_FILE_NAMES.has(path.basename(configPath))
}

export async function getPrettierOptions(target: PrettierTarget) {
  try {
    const prettier = await getPrettier(target.workspacePath)
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

function readConfigContent(configPath: string): string | null {
  try {
    return fs.readFileSync(configPath, 'utf8')
  } catch (error: any) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function readPrettierConfig(
  target: PrettierTarget,
): Promise<PrettierConfigState> {
  const { configPath } = target
  const isWritable = isWritableConfigPath(configPath)
  const originalContent = readConfigContent(configPath)
  const state = { configPath, isWritable, originalContent }

  if (originalContent === null) {
    return { config: {}, ...state }
  }

  if (!isWritable) {
    const prettier = await getPrettier(target.workspacePath)
    const config = (await prettier.resolveConfig(configPath)) ?? {}
    return { config, ...state }
  }

  const configFile = originalContent
  if (!configFile.trim()) {
    return { config: {}, ...state }
  }

  try {
    const config = JSON.parse(configFile)
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('설정은 JSON 객체여야 합니다.')
    }
    return { config, ...state }
  } catch (error: any) {
    throw new Error(
      `${path.basename(configPath)} 파일이 올바른 JSON이 아닙니다: ${error.message}`,
    )
  }
}

export function savePrettierConfig(
  config: PrettierConfig,
  log: vscode.OutputChannel,
  state: PrettierConfigState,
): PrettierConfigState {
  const { configPath } = state
  if (!isWritableConfigPath(configPath)) {
    throw new Error(
      `${path.basename(configPath)} 파일은 자동 저장을 지원하지 않습니다. 현재는 .prettierrc 또는 .prettierrc.json만 저장할 수 있습니다.`,
    )
  }

  const uri = vscode.Uri.file(configPath)
  if (
    vscode.workspace.textDocuments.some(
      (document) =>
        document.uri.toString() === uri.toString() && document.isDirty,
    )
  ) {
    throw new Error(
      '설정 파일에 저장하지 않은 편집 내용이 있습니다. 파일을 저장하거나 변경을 취소한 뒤 패널을 다시 열어주세요.',
    )
  }
  if (readConfigContent(configPath) !== state.originalContent) {
    throw new Error(
      '패널을 연 이후 설정 파일이 변경되거나 삭제되었습니다. 패널을 다시 열어 최신 설정을 불러와주세요.',
    )
  }

  // Preserve overrides, schema, plugin options, and explicit default values.
  const merged = { ...state.config, ...config }
  // The webview sends null only to explicitly reset rangeEnd to its default.
  if (merged.rangeEnd === null) delete merged.rangeEnd
  const content = JSON.stringify(merged, null, 2) + '\n'
  try {
    fs.writeFileSync(configPath, content, {
      encoding: 'utf8',
      flag: state.originalContent === null ? 'wx' : 'w',
    })
    log.appendLine(`Saved Prettier config: ${configPath}`)
    return { ...state, config: merged, originalContent: content }
  } catch (err) {
    throw new Error('설정 저장 중 오류 발생: ' + err)
  }
}

export async function formatCode(
  config: PrettierConfig,
  target: PrettierTarget,
  language = 'javascript',
): Promise<string> {
  if (!Object.prototype.hasOwnProperty.call(PREVIEW_EXAMPLES, language)) {
    throw new Error('지원하지 않는 미리보기 언어입니다.')
  }
  const example = PREVIEW_EXAMPLES[language]
  const prettier = await getPrettier(target.workspacePath)
  const previewConfig = { ...config }
  if (previewConfig.rangeEnd === null) delete previewConfig.rangeEnd
  const formatted = await prettier.format(example.code, {
    ...previewConfig,
    parser: example.parser,
  })
  return formatted
}

export function validateNumericOptions(config: PrettierConfig, options: any[]) {
  for (const option of options) {
    if (
      option.type !== 'int' ||
      !Object.prototype.hasOwnProperty.call(config, option.name)
    )
      continue
    const value = config[option.name]
    if (option.name === 'rangeEnd' && value === null) continue
    if (
      !Number.isSafeInteger(value) ||
      (Number.isFinite(option.range?.start) && value < option.range.start) ||
      (Number.isFinite(option.range?.end) && value > option.range.end)
    ) {
      throw new Error(`${option.name}: 허용 범위의 정수를 입력해주세요.`)
    }
  }
}
