# CheckReading Admin 프로토타입

## 필수 참조 문서

Admin은 CheckReading 서비스를 운영하기 위한 관리자 콘솔이다. **작업 시작 전 반드시 아래 두 문서를 읽고 서비스 개념·용어·데이터 구조를 파악할 것.**

- `../SERVICE.md` — 서비스 핵심 개념 (레벨 체계 Lv.1~Lv.6+, 시선 상태, 사용자 유형, 알림, 점수 등) — **레포 루트 공통 문서, prototype과 공유**
- `../prototype/DESIGN.md` — UI 패턴, 책 데이터 구조, 색상 팔레트, Alpine.js 패턴

Admin의 모든 데이터 구조와 용어는 prototype과 일치해야 한다.  
**서비스 개념·용어·데이터 구조가 바뀌면 루트 `../SERVICE.md`를 먼저 업데이트할 것.**

## 개요
GitHub repo: `robotkiwi2/CheckReading-manual`, branch `main`, path `/admin/`
배포 URL: https://robotkiwi2.github.io/CheckReading-manual/admin/
로컬 경로: `C:/Users/robot/BNR/리더스아이 개발 - 문서/94. CheckReading gitbook Manual/admin/`

기술 스택: Tailwind CSS CDN + Alpine.js v3 CDN. 빌드 없음. 사이드바 레이아웃(데스크탑).

---

## 완료된 화면

| 파일 | 내용 | 주요 기능 |
|------|------|-----------|
| `index.html` | 로그인 | 버튼 누르면 바로 진입 (프로토타입 — 검증 없음) |
| `dashboard.html` | 대시보드 | KPI 카드 4종, 신규 가입 라인차트, 구독 도넛차트, 최근 가입 목록, 인기 도서 TOP5 |
| `users.html` | 회원 관리 | 검색/필터(플랜·상태)/페이지네이션, 우측 슬라이드 상세 패널(자녀 목록·통계) |
| `books.html` | 도서 관리 | 출판 탭 4종(출판중/출판대기/출판중지/제작중), 카드/표 뷰 토글, 검색·장르·레벨·정렬 필터, 우측 편집 패널 |
| `recommendations.html` | 추천 관리 | 탭 4종 + 드래그 정렬 + 우측 편집 패널 |

---

## 설계 결정

- **인증**: localStorage `cr_admin` 저장. 프로토타입이므로 로그인 검증 없음.
- **디자인 시스템**: prototype과 동일 — `blue-700` 기본, 프로필 색상 8종 (`#2e4f8f`, `#5c2e8c`, `#1e6840`, `#8a2424`, `#7a5c1e`, `#1e5c6e`, `#6e1e5c`, `#3d6e1e`)
- **사이드바**: 모든 페이지 동일 구조. 메뉴: 대시보드 / 회원 관리 / 도서 관리 / 추천 관리 / 구독 관리 / 알림 관리

---

## books.html 상세

### 탭 구조
- `publishTab`: `'출판중'` | `'출판대기'` | `'출판중지'` | `'제작중'`
- 각 책 데이터에 `publishStatus` 필드로 구분
- 현재 데이터: 출판중 14권 / 출판대기 3권 / 출판중지 2권 / 제작중 3권

### 책 데이터 구조
```js
{
  title, author,           // 원작 제목·저자
  creator,                 // 내부 제작 담당자
  genre,                   // 소설/판타지/SF/역사/자연/과학
  level,                   // 숫자 1~6 (앱 내 Lv.N으로 표시, SERVICE.md 레벨 체계)
  engLevel,                // 영어책수준 (AR 레벨: "AR 4.2" 형식)
  type,                    // 챕터북/소설/그림책/그레이디드 리더/단편집/학습서
  words,                   // 단어 수 (분량)
  color,                   // 표지 배경색 hex
  publishStatus,           // 출판중/출판대기/출판중지/제작중
  modifiedDate,            // 수정일 YYYY-MM-DD
  reads, avgWpm, avgScore  // 읽기 통계 (제작중/출판대기는 0)
}
```

### 필터 & 정렬
- 검색: 제목·저자·제작자
- 장르: 소설/판타지/SF/역사/자연/과학
- 종류: 챕터북/소설/그림책/그레이디드 리더/단편집/학습서
- 레벨: Lv.1~Lv.6 (숫자)
- 정렬: 읽기 많은/적은 순, 제목 가나다, 레벨 낮은/높은 순, 최근 수정순, 단어 많은 순, 퀴즈 점수 순

### 뷰 모드
- `viewMode: 'card'` — 120px 폭 세로형 카드 (auto-fill 그리드)
- `viewMode: 'table'` — 표형 (표지 썸네일 + 전체 통계 컬럼)

---

## recommendations.html 상세

### 탭 구조 (4종)
- **프로필 추천 선반**: 프로필 선호 설정에 따라 할당되는 개인화 스키마
- **공통 추천 선반**: 전체 사용자 공통 노출 스키마
- **이벤트 추천 선반**: 기간 한정 이벤트성 스키마 (방학특집, 크리스마스 등). 노출 시작·종료일 설정 가능
- **상단 홍보**: 서점 최상단 배너에 직접 노출할 책 관리 (책 제목, 홍보 문구, 태그+색상, 표지 배경색, 노출 기간)

### 프로필 추천 선반 스키마 6종 (prototype 책추천설정과 1:1 대응)
| 스키마 | filterType | 기본 활성 |
|--------|-----------|---------|
| 레벨 맞춤 추천 | level | ON |
| 장르 선호 추천 | genre | ON |
| 완독 이력 기반 추천 | history | ON |
| 또래에게 인기있는 책 | peer | ON |
| 이어지는 시리즈 | series | ON |
| 새로운 장르 탐색 | explore | OFF (opt-in) |

### 스키마 데이터 구조
```js
{
  id, name, description,
  filterType,           // level/genre/history/peer/series/explore/popular/new/editor/words/custom
  conditionSummary,     // 테이블에 표시되는 조건 요약 문자열
  sortBy,               // reads_desc/score_desc/level_asc/new/series_order/random 등
  maxBooks,             // 최대 표시 권수 (3~30)
  isActive,             // 활성화 여부
  updatedDate,          // YYYY-MM-DD
  assignedCount,        // 할당된 프로필 수 (profile 탭만)
  // 이벤트 선반 추가 필드:
  eventTag,             // 배지 텍스트 (예: '여름방학')
  startDate, endDate,   // 노출 기간 YYYY-MM-DD
  // 조건별 필드 (filterType에 따라 사용):
  levelMin, levelMax, levelRelative,
  genres[], genreFromProfile,
  minCompleted, popularPeriod,
  newWithinDays, wordsMin, wordsMax,
  peerAgeDelta, peerSameGender,
  seriesRecentDays, customNote,
}
```

### 상단 홍보 데이터 구조
```js
{
  id, bookTitle, author,
  tag,          // 홍보 태그 텍스트 (신간, 추천, 이벤트 등)
  tagColor,     // 태그 색상 hex
  subtitle,     // 배너 부제 / 홍보 문구
  coverColor,   // 표지 배경색 hex (프로필 팔레트 8종 또는 직접 입력)
  startDate, endDate,
  isActive, updatedDate,
}
```

### 드래그 정렬
모든 탭에서 행을 드래그해 순서 변경 가능. 그립 핸들(⋮⋮) 클릭 시 cursor:grab. 드래그 중 파란 상단 선으로 삽입 위치 표시.

---

## 미완성 / 계획 중

| 항목 | 설명 |
|------|------|
| `subscriptions.html` | 구독 관리 (플랜별 목록, 결제 내역) |
| `notifications.html` | 알림 관리 (공지 발송, 푸시 이력) |
| 회원 상세 — 읽기 이력 탭 | 자녀별 읽기 세션 로그 |
| 도서 상세 — 챕터 관리 | 챕터 목록 CRUD |
| 대시보드 — 기간 필터 | 7일/30일/이번달 실제 데이터 전환 |

---

## 작업 시 주의

- 사이드바 HTML은 모든 페이지에 동일하게 복사되어 있음 (컴포넌트 없음). 메뉴 추가 시 전 파일 모두 수정 필요.
- prototype-sns 폴더는 실험적 버전 — 신경 쓰지 말 것.
- 작업 완료 후 `admin/` 경로로 커밋 + 푸시. Stop 훅이 자동 처리.
