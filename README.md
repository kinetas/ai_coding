# 포트폴리오 소개 페이지

취업활동용 이력/포트폴리오 소개 페이지입니다. 메인화면에서 네비게이터를 통해 각 페이지로 이동할 수 있습니다.

## 사용 방법

### 1. 네비게이션
- 상단 메뉴: **프로필** | **경력** | **역량** | **포트폴리오**
- 클릭 시 해당 페이지로 이동

### 2. 코드로만 수정하는 부분 (index.html)

**프로필 페이지**
- 프로필 사진: `<img src="">`에 이미지 경로
- 생년월일: `<span id="birthdate">`
- 전화번호: `<span id="phone">`
- 자기소개: `<p id="introText">`

**경력 페이지**
- 학력: `<div id="educationList">` 내부

### 3. 편집모드 (동적 추가)

1. 주소 뒤에 `?edit=1`을 붙여 **편집 세션**으로 접속 (예: `index.html?edit=1`)
2. 상단에 **편집모드 바**가 표시됨
3. 경력/역량/프로젝트 페이지의 **캔버스 영역에서 우클릭**
3. 툴박스에서 원하는 기능 선택
4. **우클릭한 위치**에 콘텐츠가 생성됨
5. **드래그**로 원하는 위치로 이동
6. **편집모드 종료** 시 자동 저장

### 4. 툴박스 기능
- **컨텐츠 박스**: 포스트잇 (텍스트, 이미지 URL, 태그)
- **표 추가**: 행/열 지정 후 표
- **논문**: 경력 페이지
- **자격증 / 프로그램**: 역량 페이지
- **프로젝트**: 포트폴리오 페이지
- **검색**: 태그·표·콘텐츠에서 텍스트 검색

### 5. 배포(일반 방문) 모드
- 일반 방문(주소에 `?edit=1`이 없음)에서는 **편집 UI가 숨겨지고 상단 여백도 생기지 않도록** 레이아웃이 자동으로 조정됩니다.
- 데이터 로딩 우선순위는 다음과 같습니다.
  - `published_data.js` (배포용 고정 데이터)가 있으면 **우선 적용**
  - 없으면 `localStorage`에 저장된 데이터로 로드

### 6. 배포 파일 생성 (`published_data.js`)
- 편집 세션(`?edit=1`)에서 상단의 **배포 파일 생성** 버튼을 누르면 `published_data.js`가 다운로드됩니다.
- 생성된 `published_data.js`를 `index.html`과 **같은 폴더**에 두면, 일반 방문 모드에서 해당 데이터가 자동으로 반영됩니다.

### 7. GitHub 동기화(저장하면 랜딩 반영)
편집 세션 상단의 **GitHub 동기화** 버튼으로 `published_data.js`를 GitHub 저장소에 커밋할 수 있습니다. GitHub Pages를 랜딩으로 쓰는 경우, 커밋 후 자동 배포되어 일반 방문 모드에 반영됩니다(반영까지 수십 초~수분 지연 가능).

#### GitHub Actions 방식 설정 (workflow_dispatch)
1. 이 레포에 워크플로가 포함되어 있습니다: `.github/workflows/portfolio_publish.yml`
2. (선택) Actions Secret 설정 (레포 Settings → Secrets and variables → Actions → New repository secret)
   - `PORTFOLIO_PUBLISH_PASSWORD_SHA256`: 편집 비밀번호의 SHA-256(hex)
3. 편집 세션에서 **GitHub Token(PAT)**을 입력하고 동기화 실행
   - 토큰은 workflow 호출 권한이 필요합니다(예: classic PAT의 `workflow` 등)
4. 데이터가 큰 경우(특히 이미지 DataURL 포함) Actions 입력 제한으로 실패할 수 있습니다.
   - 이 경우 `배포 파일 생성`으로 `published_data.js`를 받은 뒤 수동 커밋을 권장합니다.

## 파일 구조
- `index.html` - 메인 페이지
- `styles.css` - 스타일
- `app.js` - 편집/드래그/저장 로직
- `.github/workflows/portfolio_publish.yml` - Actions로 커밋(옵션)
