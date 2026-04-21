# Prototype Design Reference

## Stack

- **Tailwind CSS** CDN — utility-first styling
- **Alpine.js** v3 CDN (`defer`) — reactive UI
- **No build step** — 파일 직접 열거나 GitHub Pages로 서빙
- **GitHub repo**: `robotkiwi2/CheckReading-manual`, branch `main`, path `/prototype/`

---

## 화면 목록

| 파일 | 진입 조건 | 설명 |
|------|----------|------|
| `index.html` | 없음 | 로그인 (부모/학생 탭) |
| `profiles.html` | parent | 자녀 프로필 목록 |
| `profile-detail.html` | parent | 프로필 상세 (통계, 읽는 중, 필독서) |
| `bookstore.html` | any | 서점 (카테고리별 캐러셀 + 책 상세 패널) |
| `bookshelf.html` | any | 책장 (프로필 선택 바 + 탭 4종 + 선택 삭제) |
| `chat.html` | any | 소통 (채팅방 목록 + 채팅 패널) |
| `myinfo.html` | any | 내 정보 (학생/부모 분기, 우측 슬라이드인) |
| `reader.html` | any | 책 뷰어 (캘리브레이션 → 읽기 컨트롤러) |

> `login.html`, `hub.html` — 구버전, 미사용

---

## 메뉴 순서

```
프로필(parent only) → 소통 → 서점 → 내 책장 → 내 정보
```

사이드바(lg+)와 하단 탭바(lg 미만) 모두 동일한 순서 유지.  
`프로필` 항목은 `x-show="isParent"`로 학생에게 숨김.

---

## User State (localStorage)

```js
// 로그인 후 항상 존재
cr_user = {
  name: '김여사',       // 부모 닉네임 or 학생 이름
  type: 'parent',      // 'parent' | 'student'
  initial: '김'        // 이름 첫 글자
}

// 부모가 profiles.html에서 프로필 선택 시 저장
cr_profile = {
  id: 'hong',
  name: '홍길동',
  initial: '홍',
  age: 9,
  level: 'Lv.3',
  reading: 3,
  done: 12,
  color: 'linear-gradient(135deg,#667eea,#764ba2)',
  accent: '#667eea',        // 그라디언트 첫 색상 — 버튼 텍스트 등에 사용
  online: true,             // 현재 뷰어 열려 있는지 (WebSocket 상태)
  today: {
    score: 124,
    time: 42,               // 분
    words: 1840,
    eye: { reading: 65, scanning: 22, lost: 13 }  // % 합계 = 100
  },
  isOther: false            // true이면 다른 사용자의 자녀 (즐겨찾기)
}
```

---

## Auth Flow

```
index.html
  ├─ 부모 로그인 → profiles.html  (cr_user.type = 'parent')
  └─ 학생 로그인 → bookstore.html (cr_user.type = 'student')

profiles.html
  └─ 프로필 선택 → profile-detail.html (cr_profile 저장)

모든 페이지: cr_user 없으면 index.html 리다이렉트
profiles.html: type !== 'parent'이면 리다이렉트
```

---

## 공통 레이아웃 패턴

```
body  height:100dvh; overflow:hidden
└─ .flex.justify-center
   ├─ aside.hidden.lg:flex  (사이드바, lg+)
   └─ .flex-col.max-w-3xl
      ├─ header.flex-shrink-0
      ├─ main.flex-1.overflow-y-auto.min-h-0   ← 스크롤 영역
      └─ nav.lg:hidden.flex-shrink-0           ← 하단 탭바
```

**핵심**: `main`에 `min-h-0` 없으면 flex child가 높이를 못 받아 scroll 안 됨.

공통 init 패턴:
```js
init() {
  this.user = JSON.parse(localStorage.getItem('cr_user') || 'null');
  if (!this.user) { window.location.href = 'index.html'; return; }
  this.isParent = this.user.type === 'parent';
}
```

---

## 우측 슬라이드인 페이지 (myinfo.html)

`index.html`에서 직접 이동하는 것이 아니라, 다른 페이지에서 `myinfo.html`로 이동 시
우측에서 밀려오는 애니메이션으로 "sub-page" 느낌을 줌.

```html
<style>
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  #page-wrapper { animation: slideInRight 0.3s cubic-bezier(0.25,0.46,0.45,0.94); }
</style>

<!-- 뒤로가기 버튼 -->
<button onclick="goBack()">...</button>
```

```js
function goBack() {
  const el = document.getElementById('page-wrapper');
  el.style.transition = 'transform 0.25s ease-in';
  el.style.transform = 'translateX(100%)';
  setTimeout(() => history.back(), 250);
}
```

---

## myinfo.html — 학생/부모 분기

같은 파일 내에서 `isParent`로 분기. `<main>` 안에 두 `<div>`가 공존.

```html
<main class="flex-1 overflow-y-auto min-h-0">
  <!-- 학생 콘텐츠 -->
  <div x-show="!isParent">
    <!-- profile-detail.html과 동일한 그라디언트 카드, 뱃지, 점수, 캘린더 -->
    <!-- 차이점: 톱니바퀴(수정) 버튼 없음 -->
  </div>
  <!-- 부모 콘텐츠 -->
  <div x-show="isParent">
    <!-- 프로필 카드 (닉네임 + 연동 계정 + 편집 버튼) -->
    <!-- 구독 섹션 -->
    <!-- 결제 수단 (케밥 메뉴) -->
    <!-- 결제 내역 -->
    <!-- 기타 (약관/로그아웃/탈퇴) -->
  </div>
</main>
```

### 부모 뷰 Alpine 데이터

```js
return {
  user: null, isParent: false, profile: null,
  // 캘린더 (학생 뷰)
  calYear: 2026, calMonth: 3,
  calDays: [], calStartDay: 0,
  daySheet: false, selectedDay: { label: '' },
  // 편집 시트 (부모 뷰)
  showEditSheet: false, editName: '',
  cardMenuOpen: false,
  showCancelConfirm: false,   // 구독중단 확인
  showTerms: false,           // 이용약관 시트
  showPrivacy: false,         // 개인정보처리방침 시트
  showLogoutConfirm: false,
  showDeleteConfirm: false,
  payHistory: [
    { date: '2026.04.20', plan: '월간 구독', amount: 10000 },
    ...
  ],
  // 메서드
  openEdit() { ... },
  saveEdit() { ... },
  doLogout() { localStorage.removeItem('cr_user'); localStorage.removeItem('cr_profile'); location.href='index.html'; },
  doDelete() { localStorage.clear(); location.href='index.html'; },
}
```

---

## bookshelf.html — 책 선택 삭제 모드

### 진입
- **모바일**: 책 롱프레스 500ms → `selectMode=true` + 진동(`navigator.vibrate(30)`)
- **웹**: 책에 `mouseenter` → 체크박스 노출 → 클릭으로 선택 진입

### Alpine 데이터

```js
selectMode: false,
selectedIds: [],    // book.id 배열
hoveredBookId: null,
removedIds: [],     // 삭제된 book.id (세션 내 필터용, localStorage 미반영)
longPressTimer: null,
```

### currentTabs getter — removedIds 필터

```js
get currentTabs() {
  const key = this.isParent ? (this.selectedProfile?.id || 'hong') : 'student';
  const d = profileData[key] || profileData.hong;
  const f = books => books.filter(b => !this.removedIds.includes(b.id));
  return [
    { id:'reading', label:'읽고 있는 책', books: f(d.reading) },
    { id:'done',    label:'읽은 책',      books: f(d.done)    },
    { id:'wish',    label:'찜한 책',       books: f(d.wish)    },
    { id:'must',    label:'필독서',        books: f(d.must)    },
  ];
},
```

### 메서드

```js
startLongPress(book) {
  this.longPressTimer = setTimeout(() => {
    navigator.vibrate && navigator.vibrate(30);
    this.selectMode = true;
    this.selectedIds = [book.id];
  }, 500);
},
cancelLongPress() { clearTimeout(this.longPressTimer); },
toggleSelect(book) {
  const idx = this.selectedIds.indexOf(book.id);
  if (idx >= 0) this.selectedIds.splice(idx, 1);
  else this.selectedIds.push(book.id);
},
isSelected(book) { return this.selectedIds.includes(book.id); },
exitSelectMode() { this.selectMode = false; this.selectedIds = []; this.hoveredBookId = null; },
deleteSelected() {
  if (!this.selectedIds.length) return;
  this.removedIds.push(...this.selectedIds);
  this.exitSelectMode();
},
toggleSelectAll() {
  const tab = this.currentTabs.find(t => t.id === this.activeTab);
  if (!tab) return;
  if (this.isAllSelected()) this.selectedIds = [];
  else this.selectedIds = tab.books.map(b => b.id);
},
isAllSelected() {
  const tab = this.currentTabs.find(t => t.id === this.activeTab);
  return tab && tab.books.length > 0 && tab.books.every(b => this.selectedIds.includes(b.id));
},
```

### 책 카드 HTML 요점

```html
<div class="group relative"
     :class="selectMode ? 'cursor-default' : 'cursor-pointer'"
     @click="selectMode ? toggleSelect(book) : openBook(book)"
     @mouseenter="hoveredBookId=book.id"
     @mouseleave="hoveredBookId=null"
     @touchstart.passive="startLongPress(book)"
     @touchmove.passive="cancelLongPress()"
     @touchend.passive="cancelLongPress()">

  <!-- 체크박스 (선택모드 or 호버) -->
  <div x-show="selectMode || hoveredBookId===book.id"
       class="absolute top-1.5 left-1.5 z-10 pointer-events-none">
    <div class="w-5 h-5 rounded-full border-2 ..."
         :class="isSelected(book) ? 'bg-indigo-600 border-indigo-600' : 'bg-white/90 border-gray-300'">
      <svg x-show="isSelected(book)">체크</svg>
    </div>
  </div>

  <!-- 커버: 선택 시 ring + 오버레이 -->
  <div class="w-full aspect-[3/4] rounded-xl ..."
       :class="[isSelected(book) ? 'ring-2 ring-inset ring-indigo-400' : '',
                !selectMode ? 'group-hover:scale-105' : '']"
       :style="`background:${book.color}`">
    <div x-show="isSelected(book)" class="absolute inset-0 bg-indigo-500/25"></div>
    ...
  </div>
</div>
```

### 선택모드 헤더 / 삭제바

헤더 타이틀 행: `x-if="!selectMode"` / `x-if="selectMode"` 분기 (`x-if`는 `x-show`와 달리 DOM 제거)

하단 삭제바: `x-show="selectMode"` → 탭바 위에 위치, 탭바는 `x-show="!selectMode"`

---

## 드래그 스크롤 (bookshelf main 영역)

```js
function initDragScroll(el) {
  if (!el) return;
  let startY = 0, scrollStart = 0, dragging = false, moved = false;
  let velY = 0, prevY = 0, prevT = 0, raf = null;

  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    cancelAnimationFrame(raf);
    dragging = true; moved = false;
    startY = e.clientY; scrollStart = el.scrollTop;
    prevY = e.clientY; prevT = Date.now(); velY = 0;
  });
  el.addEventListener('click', e => {
    if (moved) { e.stopPropagation(); e.preventDefault(); }
  }, true);  // capture phase — drag 중 click 차단
  document.addEventListener('mousemove', e => { ... });
  document.addEventListener('mouseup', () => { ... glide with velY *= 0.90 ... });
}
// 호출: this.$nextTick(() => initDragScroll(this.$refs.mainScroll))
```

CSS:
```css
.drag-scroll { cursor: grab; user-select: none; }
.drag-scroll.grabbing { cursor: grabbing; }
```

---

## 드래그 캐러셀 (bookstore.html)

```js
function initCarousels() {
  // 단일 global mousemove/mouseup 핸들러 — carousel마다 붙이면 N개 리스너 버그
  let el = null, startX = 0, scrollStart = 0, moved = false;
  let velX = 0, prevX = 0, prevT = 0, raf = null;

  document.querySelectorAll('.carousel').forEach(carousel => {
    carousel.addEventListener('mousedown', e => { el = carousel; ... });
    carousel.addEventListener('click', e => {
      if (moved) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  });
  document.addEventListener('mousemove', e => { ... velX 계산 ... });
  document.addEventListener('mouseup', () => { ... glide ... });
}
// 호출: this.$nextTick(() => initCarousels())
```

---

## 슬라이드업 패널 패턴

### 고정 오버레이형 (모달/시트 공통)

```html
<div x-show="open" x-cloak
     class="fixed inset-0 bg-black/40 z-40 flex items-end justify-center"
     x-transition:enter="transition ease-out duration-200"
     x-transition:enter-start="opacity-0"
     x-transition:enter-end="opacity-100"
     x-transition:leave="transition ease-in duration-150"
     x-transition:leave-start="opacity-100"
     x-transition:leave-end="opacity-0"
     @click.self="open=false">
  <div class="w-full max-w-3xl bg-white rounded-t-3xl flex flex-col"
       x-transition:enter="transition ease-out duration-300"
       x-transition:enter-start="translate-y-full"
       x-transition:enter-end="translate-y-0"
       x-transition:leave="transition ease-in duration-200"
       x-transition:leave-start="translate-y-0"
       x-transition:leave-end="translate-y-full">
    <!-- 핸들 -->
    <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
      <div class="w-10 h-1 bg-gray-200 rounded-full"></div>
    </div>
    ...
  </div>
</div>
```

### 화면 내부 슬라이드업 패널 (bookshelf 책 상세)

```html
<div x-show="selectedBook" x-cloak
     x-transition:enter="transition ease-out duration-300 transform"
     x-transition:enter-start="translate-y-full"
     x-transition:enter-end="translate-y-0"
     x-transition:leave="transition ease-in duration-200"
     x-transition:leave-start="translate-y-0"
     x-transition:leave-end="translate-y-full"
     class="absolute inset-0 bg-white z-30 flex flex-col">
  ...
</div>
<!-- 부모 컨테이너에 relative overflow-hidden 필요 -->
```

---

## 확인 모달 패턴

```html
<div x-show="showConfirm" x-cloak
     class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
     x-transition:enter="transition ease-out duration-200"
     x-transition:enter-start="opacity-0"
     x-transition:enter-end="opacity-100"
     @click.self="showConfirm=false">
  <div class="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden"
       x-transition:enter="transition ease-out duration-200"
       x-transition:enter-start="opacity-0 scale-95"
       x-transition:enter-end="opacity-100 scale-100">
    <div class="p-6 text-center">
      <h3 class="font-bold text-gray-900 text-base mb-1">제목</h3>
      <p class="text-sm text-gray-400">설명</p>
    </div>
    <div class="flex border-t border-gray-100">
      <button @click="showConfirm=false" class="flex-1 py-3.5 text-sm font-medium text-gray-500">취소</button>
      <div class="w-px bg-gray-100"></div>
      <button @click="doAction()" class="flex-1 py-3.5 text-sm font-bold text-red-500">확인</button>
    </div>
  </div>
</div>
```

---

## 책 커버 색상 팔레트

```js
const C = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  'linear-gradient(135deg,#fd7043,#ff8a65)',
  'linear-gradient(135deg,#26c6da,#00838f)',
  'linear-gradient(135deg,#66bb6a,#2e7d32)',
  'linear-gradient(135deg,#ec407a,#880e4f)',
];
// 사용: books.map((b,i) => ({ ...b, color: C[i % C.length] }))
```

---

## 프로필 카드 그라디언트 색상 (myinfo/profile-detail)

```js
const profileColors = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
];
// 인덱스: (name.charCodeAt(0) || 0) % profileColors.length
```

---

---

## profiles.html — 오늘 읽기 현황 + 실시간 모니터링

### 프로필 데이터 구조

```js
profiles: [
  {
    id: 'hong', name: '홍길동', initial: '홍', age: 9, level: 'Lv.3',
    reading: 3, done: 12,
    color: 'linear-gradient(135deg,#667eea,#764ba2)',
    accent: '#667eea',   // 버튼 텍스트 컬러 (그라디언트 첫 색)
    online: true,        // 뷰어가 열려 있으면 true
    today: { score: 124, time: 42, words: 1840,
             eye: { reading: 65, scanning: 22, lost: 13 } }
  },
  ...
]
```

### 실시간 시뮬레이션 (WebSocket 자리)

```js
init() {
  // ...
  setInterval(() => {
    this.profiles.forEach(p => {
      if (!p.online) return;
      if (Math.random() < 0.35) p.today.score += 1;
      p.today.words += Math.floor(Math.random() * 6);
      if (Math.random() < 0.12) p.today.time += 1;
      const d = Math.floor(Math.random() * 5) - 2;
      p.today.eye.reading = Math.min(88, Math.max(20, p.today.eye.reading + d));
      const d2 = Math.floor(Math.random() * 3) - 1;
      p.today.eye.scanning = Math.min(45, Math.max(5, p.today.eye.scanning + d2));
      p.today.eye.lost = 100 - p.today.eye.reading - p.today.eye.scanning;
    });
  }, 1000);
}
```

실제 구현 시 WebSocket 메시지 핸들러로 교체. Alpine.js Proxy 기반 reactivity가 중첩 객체 변경도 감지하므로 별도 `$set` 불필요.

### 시선 상태 바 UI

```html
<!-- 세그먼트 바 -->
<div class="flex rounded-full overflow-hidden h-2.5">
  <div class="bg-emerald-400 transition-all duration-700" :style="`width:${p.today.eye.reading}%`"></div>
  <div class="bg-amber-400 transition-all duration-700"  :style="`width:${p.today.eye.scanning}%`"></div>
  <div class="transition-all duration-700"
       :class="p.today.eye.lost > 30 ? 'bg-red-500' : 'bg-red-400'"
       :style="`width:${p.today.eye.lost}%`"></div>
</div>
<!-- Lost 30% 초과: 카드 테두리 경고 -->
<div :class="p.today.eye.lost > 30 ? 'ring-2 ring-amber-400' : ''">
```

### [같이 보기] 버튼

```html
<!-- online 상태에서만 표시, @click.stop으로 카드 클릭(goProfile)과 분리 -->
<button x-show="p.online" @click.stop="openViewer(p)"
        class="mt-3 w-full py-2.5 bg-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
        :style="`color:${p.accent}`">
  <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
  같이 보기
</button>
```

```js
openViewer(p) {
  localStorage.setItem('cr_profile', JSON.stringify(p));
  window.location.href = 'reader.html';  // 미구현 — reader.html 만들면 연결
}
```

---

## profiles.html — 프로필 추가 위자드 (6단계)

우측 슬라이드인 패널 (`addPanel`), 6단계 스텝.

| 단계 | 항목 | 유효성 |
|------|------|--------|
| 1 | 배경색 선택 (컬러 그리드) | 색상 선택 여부 |
| 2 | 닉네임 입력 | 2자 이상 |
| 3 | 생년 선택 (그리드) | 선택 여부 |
| 4 | 학년 선택 (그리드) | 선택 여부 |
| 5 | 성별 카드 | 선택 여부 |
| 6 | 선호 장르 태그 | 항상 통과 (선택 선택) |

```js
canNext() {
  if (this.addStep===1) return !!this.newP.color;
  if (this.addStep===2) return this.newP.name.trim().length >= 2;
  if (this.addStep===3) return !!this.newP.birthYear;
  if (this.addStep===4) return !!this.newP.grade;
  if (this.addStep===5) return !!this.newP.gender;
  return true;
},
addNext() {
  if (!this.canNext()) return;
  if (this.addStep < 6) { this.addStep++; return; }
  const name = this.newP.name.trim();
  this.profiles.push({
    id: 'p' + Date.now(), name, initial: name[0],
    age: new Date().getFullYear() - this.newP.birthYear,
    level: 'Lv.1', reading: 0, done: 0,
    color: this.newP.color, accent: /* 첫번째 색 추출 필요 */,
    online: false,
    today: { score: 0, time: 0, words: 0, eye: { reading: 0, scanning: 0, lost: 0 } }
  });
  this.addPanel = false;
}
```

뒤로가기 버튼: `addStep > 1 ? addStep-- : addPanel = false`  
진행 바: `:style="\`width:${addStep/6*100}%\`"`

---

## profile-detail.html — 헤더 분기 (isOther)

```
isOther === true   → 헤더 우측: 하트 아이콘 (즐겨찾기 토글)
isOther === false  → 헤더 우측: 톱니 아이콘 (설정 패널 오픈)
                     (단, user.type === 'parent'인 경우만)
```

```js
favorited: false,   // 하트 토글 상태
```

```html
<template x-if="profile.isOther">
  <button @click="favorited=!favorited">
    <!-- filled/unfilled heart SVG, :class 토글로 색상 변경 -->
  </button>
</template>
<template x-if="!profile.isOther && isParent">
  <button @click="settingsPanel=true">
    <!-- 톱니 SVG -->
  </button>
</template>
```

---

## profile-detail.html — 설정 패널 구조

2단 레이어 — 메인 패널(z-30) → 하위 패널(z-40) 순으로 우측 슬라이드인.

### 메인 설정 패널 메뉴 항목

| 항목 | 아이콘 | 설명 |
|------|--------|------|
| 사진 교체 | 카메라 | 색상 그리드 |
| 닉네임 변경 | 펜 | 텍스트 입력 |
| 비밀번호 변경 | 자물쇠 | 현재/새/확인 입력 |
| 생년월 변경 | 케이크 | 년/월 select |
| 학년 변경 | 모자 | 학년 그리드 |
| 성별 변경 | 사람 | 남/여 카드 |
| 선호 책 설정 | 책 | 장르 태그 토글 |
| 책 추천 설정 | 반짝이 | 추천 알고리즘 토글 |
| 읽기 탐지 설정 | 눈 | 탐지 민감도 토글 |

맨 아래: [프로필 삭제] 빨간 outline 버튼 → 확인 모달 → `deleteProfile()`

```js
deleteProfile() {
  localStorage.removeItem('cr_profile');
  window.location.href = 'profiles.html';
}
```

### 상태 변수

```js
settingsPanel: false,    // 메인 설정 패널
settingsSub: null,       // 열린 하위 패널 id (null이면 닫힘)
deleteConfirm: false,    // 삭제 확인 모달
```

---

## bookstore.html — 프로필별 추천선반

### 선반 데이터 구조

```js
// 프로필별 선반: profile 필드 추가
{ id: 2, title: '홍길동이 좋아하는 SF 소설',
  profile: { id: 'hong', initial: '홍', name: '홍길동',
             color: 'linear-gradient(135deg,#667eea,#764ba2)' },
  books: mk([...]) }

// 공통 선반: profile 없음
{ id: 3, title: '📚 이번 주 인기 도서', books: mk([...]) }

// 책에 likedBy 배열 추가
mk([
  { title: '...', author: '...', level: '...', likedBy: ['hong', 'chun'] },
  { title: '...', author: '...', level: '...' },   // likedBy 없으면 하트 표시 안 함
])
```

### 선반 헤더 — 프로필 아바타 조건부 표시

```html
<div class="flex items-center justify-between px-4 mb-3">
  <template x-if="shelf.profile">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
           :style="`background:${shelf.profile.color}`" x-text="shelf.profile.initial"></div>
      <h3 class="font-bold text-gray-800 text-sm" x-text="shelf.title"></h3>
    </div>
  </template>
  <template x-if="!shelf.profile">
    <h3 class="font-bold text-gray-800 text-sm" x-text="shelf.title"></h3>
  </template>
  ...
</div>
```

### 책 표지 찜 하트 아이콘

```js
// app() 데이터에 추가
profileColors: { hong: '#667eea', chun: '#f093fb' },
```

```html
<!-- 책 커버를 relative로 감싸고, 우측상단에 하트 스택 -->
<div class="relative ...">
  <div x-show="book.likedBy && book.likedBy.length"
       class="absolute top-1.5 right-1.5 flex flex-col gap-0.5">
    <template x-for="pid in (book.likedBy||[])" :key="pid">
      <div class="w-4 h-4 rounded-full flex items-center justify-center shadow"
           :style="`background:${profileColors[pid]||'#aaa'}`">
        <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3..."/>
        </svg>
      </div>
    </template>
  </div>
  ...
</div>
```

---

## reader.html — 캘리브레이션 플로우

### Phase 전이

```
뷰어 열기
  └─ phase='face'    얼굴 확인 (카메라 + 타원 가이드)
       └─ confirmFace()
            └─ phase='calib1'  1점 간이 캘리브레이션 (3초)
                 └─ finishCalib1()
                      └─ phase='reading'  읽기

챕터 이동 (next/prevChapter)
  └─ _pendingChapter 저장 → startCalib1() → finishCalib1() → cur 변경 → reading

읽기 중 25초 후 (시뮬레이션)
  └─ precisionBanner = true
       └─ [재보정] → startCalib5FromBanner() → phase='calib5' → finishCalib5() → reading
       └─ [나중에] → precisionBanner = false

⚙ 설정 패널 → "5점 정밀 보정 다시 하기" / "1점 간이 보정 다시 하기"
```

### 상태 변수

```js
phase: 'face',           // 'face' | 'calib1' | 'calib5' | 'reading'

// 얼굴 확인
faceOk: false,
faceError: null,
_faceStream: null,       // getUserMedia stream

// 1점 캘리
calib1Progress: 0,       // 0–100, setInterval 50ms × 60틱 = 3초
_pendingChapter: null,   // 챕터 이동 후 적용할 번호

// 5점 캘리
calib5Points: [{x,y}, ...],  // 5개 좌표 (%, %)
calib5Step: 0,           // 0–4 현재 점
calib5Progress: 0,       // 0–100 현재 점 진행률
_calib5FromBanner: false, // true이면 완료 후 reading 복귀, false이면 calib1 대체

// 읽기
precisionBanner: false,
_precisionTimer: null,   // 25초 후 배너 트리거
```

### 얼굴 확인 화면

- `getUserMedia({ video:{ facingMode:'user' } })` → `<video>` srcObject
- CSS radial-gradient로 타원 바깥 어둡게, SVG ellipse 점선 테두리
- 감지 시뮬레이션: 1.8초 후 `faceOk = true` → 타원 테두리 보라→초록
- [확인] 버튼: `faceOk` false이면 disabled
- [보정 건너뛰기]: 시선 기능 토글 off → `enterReading()` 바로 진입
- 뒤로가기: 카메라 스트림 stop → `history.back()`

### 1점 캘리브레이션 오버레이

- `backdrop-filter:blur(6px)` + 반투명 검은 배경 — 읽기 텍스트가 어렴풋이 보임
- SVG 원형 진행 바: `stroke-dashoffset = 263.9 * (1 - progress/100)`, `transition 0.1s linear`
- 중앙 점: `calib-dot` CSS animation (이중 pulse ring)
- 3초 완료 후 400ms 딜레이 → `finishCalib1()`

### 5점 캘리브레이션 화면

```js
calib5Points = [
  { x:15, y:18 },  // 좌상
  { x:85, y:18 },  // 우상
  { x:50, y:50 },  // 중앙
  { x:15, y:82 },  // 좌하
  { x:85, y:82 },  // 우하
]
```

- 각 점: 완료(체크 아이콘) / 현재(SVG 원형 진행, r=30, 2.5초) / 대기(흐린 점)
- 점 완료 → 300ms 딜레이 → 다음 점으로 이동
- 상단 진행 바: `width = (calib5Step/5)*100 + (calib5Progress/5)`%

### 정밀 보정 권고 배너

```html
<!-- 읽기 중, showUI 여부와 무관하게 항상 z-40에 표시 -->
<div x-show="precisionBanner && phase==='reading'">
  amber 배너: "시선 감지 품질이 낮아졌습니다" [재보정] [나중에]
</div>
```

### 진입 경로 요약

```
bookstore.html [책 읽기] / TOC 챕터 클릭
  → localStorage.setItem('cr_reader_chapter', N)
  → reader.html

profiles.html [같이 보기]
  → localStorage.setItem('cr_profile', ...)
  → reader.html  (부모 모니터링 모드 — 미구현)
```

---

## 케밥 메뉴 패턴

카드 내부에서 상대 위치로 드롭다운 표시.

```html
<div class="relative">
  <button @click.stop="menuOpen=!menuOpen">⋮</button>
  <div x-show="menuOpen" x-cloak @click.outside="menuOpen=false"
       class="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-44 overflow-hidden"
       x-transition:enter="transition ease-out duration-150"
       x-transition:enter-start="opacity-0 scale-95 -translate-y-1"
       x-transition:enter-end="opacity-100 scale-100 translate-y-0">
    <button @click="menuOpen=false" class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
      일반 액션
    </button>
    <div class="h-px bg-gray-100"></div>
    <button @click="menuOpen=false" class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50">
      위험 액션
    </button>
  </div>
</div>
```
