# Prettier Studio

<div align="center">

[![Version](https://img.shields.io/badge/version-2.0.1-blue?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=PrestigeLulu.prettier-studio)
[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-Prettier%20Studio-007ACC?style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=PrestigeLulu.prettier-studio)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

<img src="./media/image.png" alt="Prettier Studio Logo" width="200"/>

**Prettier 설정을 실시간으로 미리보고 조정할 수 있는 VS Code 확장 프로그램**

[설치하기](https://marketplace.visualstudio.com/items?itemName=PrestigeLulu.prettier-studio) | [이슈 보고](https://github.com/PrestigeLulu/PrettierStudio/issues) | [기여하기](https://github.com/PrestigeLulu/PrettierStudio)

</div>

## ✨ 소개

Prettier Studio는 VS Code에서 Prettier 설정을 쉽게 미리보고 수정할 수 있게 해주는 확장 프로그램입니다. 복잡한 설정 파일을 직접 수정할 필요 없이, 직관적인 인터페이스를 통해 코드 스타일을 완벽하게 제어할 수 있습니다.

## 🚀 주요 기능

- 📝 Prettier 설정을 실시간으로 미리보기
- 👀 코드 포맷팅 결과를 즉시 확인
- 🎯 직관적인 인터페이스를 통한 설정 변경
- 🛠 다양한 포맷팅 옵션 지원
- 📦 워크스페이스에 설치된 Prettier 버전 사용
- 💡 Apply 버튼으로 안전하게 설정 저장
- 🧭 설정 패널과 미리보기 패널 너비 조정
- 🗒 옵션별 한국어 툴팁 제공
- 🌐 JavaScript/JSX, TypeScript, HTML, Vue, Markdown, CSS, JSON 예제 선택
- ✅ 숫자 입력 오류 표시 및 잘못된 값의 저장 차단
- 📦 외부 CDN 없이 동작하는 로컬 구문 강조

## 📥 설치 방법

1. VS Code의 확장 프로그램 마켓플레이스에서 'Prettier Studio' 검색
2. 설치 버튼 클릭
3. VS Code 재시작

## 📖 사용 방법

1. `.prettierrc` 파일 열기
2. 우측 하단에 `Prettier Studio` 버튼 누르기
3. 설정 창에서 원하는 Prettier 옵션 조정
4. 실시간으로 포맷팅 결과 확인
5. `Apply` 버튼으로 설정 저장

설정 패널은 열 당시 문서가 속한 프로젝트와 설정 파일을 사용합니다. 여러 프로젝트를 열고 활성 문서가 없으면 대상 프로젝트를 선택합니다. 패널을 연 뒤 다른 프로젝트로 이동해도 저장 대상은 바뀌지 않습니다.

Apply는 기존 `overrides`, 플러그인 옵션, 명시적 기본값을 보존합니다. 설정 파일에 미저장 편집이 있거나 패널을 연 이후 파일이 변경·삭제되면 저장을 차단합니다. 이 경우 파일 편집을 저장하거나 취소한 뒤 패널을 닫고 다시 열어 최신 설정을 불러오세요.

미리보기 상단에서 언어를 선택하면 해당 언어 예제에 현재 옵션을 적용합니다. 언어 선택은 미리보기에만 적용되며 설정 파일의 `parser`를 변경하지 않습니다. 숫자 입력이 정수·허용 범위 조건에 맞지 않으면 오류를 표시하고 미리보기 갱신과 Apply를 차단합니다. `rangeEnd`는 비워둘 수 있으며, 비워두면 파일 끝까지 포맷합니다. 기존 값을 지우고 Apply를 누르면 설정 파일에서도 `rangeEnd`를 제거합니다. 구문 강조는 기존 Atom One Dark 테마를 로컬 파일로 제공합니다.

> Prettier Studio는 현재 워크스페이스의 `node_modules/prettier`를 사용합니다. 프로젝트에 Prettier가 설치되어 있지 않다면 먼저 `npm install -D prettier` 또는 `yarn add -D prettier`로 설치해주세요.

<div align="center">
Prettier Studio 사용 예시
  <video src = "https://github.com/user-attachments/assets/5f4b921b-684a-46aa-80c0-7d55b3485db1"/>
</div>

## 🔧 지원하는 설정 옵션

- `printWidth`: 줄 길이 제한
- `tabWidth`: 탭 간격 설정
- `useTabs`: 탭 사용 여부
- `semi`: 세미콜론 사용 여부
- `singleQuote`: 작은따옴표 사용 여부
- `bracketSpacing`: 객체 리터럴의 중괄호 간격
- 그 외 다양한 Prettier 옵션 지원

## ⚙️ 설정 파일 지원

- `.prettierrc`
- `.prettierrc.json`
- `.prettierrc.yaml`, `.prettierrc.yml`
- `.prettierrc.js`, `.prettierrc.cjs`, `.prettierrc.mjs`
- `prettier.config.js`, `prettier.config.cjs`, `prettier.config.mjs`, `prettier.config.ts`

저장은 안전한 JSON 계열 설정 파일인 `.prettierrc`, `.prettierrc.json`에서 지원합니다. JS/YAML 설정 파일은 읽기 전용으로 불러옵니다.

## 🆕 2.0.1

- 기존 설정 보존 및 저장 충돌 감지
- 여러 워크스페이스에서 대상 프로젝트와 설정 파일 선택 개선
- 숫자 입력 검증 및 `rangeEnd` 빈 값 지원
- 7개 언어별 미리보기와 오래된 응답 처리 개선
- 로컬 Atom One Dark 구문 강조 및 글꼴 표시 수정
- 웹뷰 CSP 적용 및 외부 CDN 의존성 제거

## 2.0.0

- 확장에 내장된 Prettier 대신 워크스페이스 Prettier 사용
- VS Code 웹뷰 상태 유지 개선
- 설정 파일 탐색과 저장 UX 개선
- 패널 너비 조정 기능 추가
- 미리보기 코드와 옵션 툴팁 개선
- 패키징 의존성 정리

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👨‍💻 개발자 정보

<div align="center">

### 루루 (Lulu)

[![GitHub](https://img.shields.io/badge/GitHub-PrestigeLulu-181717?style=for-the-badge&logo=github)](https://github.com/PrestigeLulu)
[![Email](https://img.shields.io/badge/Email-alsrb4171%40gmail.com-EA4335?style=for-the-badge&logo=gmail)](mailto:alsrb4171@gmail.com)

</div>

---

<div align="center">
⭐️ 이 프로젝트가 마음에 드신다면 GitHub 스타를 눌러주세요! ⭐️
</div>
