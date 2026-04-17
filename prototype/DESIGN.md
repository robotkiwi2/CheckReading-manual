# Prototype Design Reference

## Stack
- **Tailwind CSS** (CDN) — utility-first styling
- **Alpine.js** (CDN, defer) — reactive UI (`x-data`, `x-for`, `x-show`, `x-transition`)
- **No build step** — 파일 직접 열거나 GitHub Pages로 서빙

## Screens

| File | Route | Auth | Description |
|------|-------|------|-------------|
| `index.html` | / | 없음 | 로그인 (부모/학생 탭) |
| `profiles.html` | /profiles | parent | 자녀 프로필 목록 |
| `profile-detail.html` | /profile-detail | parent | 프로필 상세 (통계, 읽는 중, 필독서) |
| `chat.html` | /chat | any | 소통 (채팅방 목록 + 채팅 패널) |
| `bookstore.html` | /bookstore | any | 서점 (카테고리별 캐러셀) |
| `bookshelf.html` | /bookshelf | any | 책장 (읽는 중/읽은 책/찜/필독서 탭) |

> `login.html`, `hub.html` — 구버전, 미사용

## 메뉴 순서

프로필 (parent only) → 소통 → 서점 → 내 책장 → 내 정보

## User State (localStorage)

```js
cr_user = {
  name: '김여사',       // or '홍길동'
  type: 'parent',      // or 'student'
  initial: '김'
}

cr_profile = {
  id: 'hong',          // or 'chun'
  name: '홍길동',
  initial: '홍',
  age: 9,
  level: 'Lv.3',
  reading: 3,
  done: 12,
  color: 'linear-gradient(...)'
}
```

## Auth Flow

```
index.html
  ├─ 부모 로그인 → profiles.html  (cr_user.type = 'parent')
  └─ 학생 로그인 → bookstore.html (cr_user.type = 'student')

profiles.html → profile-detail.html  (cr_profile 저장 후 이동)
```

모든 페이지: `cr_user` 없으면 `index.html`로 리다이렉트.  
`profiles.html`: `type !== 'parent'`이면 리다이렉트.

## Layout Pattern (공통)

```
body  height:100dvh; overflow:hidden
└─ .flex (justify-center)
   ├─ aside.hidden.lg:flex  ← 사이드바 (lg+)
   └─ .flex-col.max-w-3xl
      ├─ header.flex-shrink-0
      ├─ main.flex-1.overflow-y-auto.min-h-0   ← 스크롤 여기만
      └─ nav.lg:hidden.flex-shrink-0           ← 하단 탭바 (lg 미만)
```

**핵심**: `main`에 `min-h-0` 없으면 flex child가 높이를 못 받아서 scroll 안 됨.

## 프로필 메뉴 (부모만)

사이드바와 하단 탭바 모두 `x-show="isParent"`로 프로필 항목 토글.

```js
init() {
  this.user = JSON.parse(localStorage.getItem('cr_user') || 'null');
  if (!this.user) { window.location.href = 'index.html'; return; }
  this.isParent = this.user.type === 'parent';
}
```

## 드래그 캐러셀 패턴

**중요**: `initCarousels()`는 반드시 Alpine `init()` 안에서 `this.$nextTick(() => initCarousels())`로 호출.  
→ `x-for`로 렌더링된 DOM이 완성된 후에 이벤트 바인딩해야 함.

**단일 global 핸들러** — carousel마다 document listener 붙이면 N개 리스너 생겨서 버그남.

```js
function initCarousels() {
  let el = null, startX = 0, scrollStart = 0;
  let velX = 0, prevX = 0, prevT = 0, raf = null, moved = false;

  document.querySelectorAll('.carousel').forEach(carousel => {
    carousel.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      cancelAnimationFrame(raf);
      el = carousel; startX = e.clientX; scrollStart = carousel.scrollLeft;
      prevX = e.clientX; prevT = Date.now(); velX = 0; moved = false;
      e.preventDefault();
    });
    // click 후 openBook 방지
    carousel.addEventListener('click', e => {
      if (moved) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  });

  document.addEventListener('mousemove', e => {
    if (!el) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { el.classList.add('grabbing'); moved = true; }
    el.scrollLeft = scrollStart - dx;
    const now = Date.now(), dt = Math.max(now - prevT, 1);
    velX = (prevX - e.clientX) / dt * 15;
    prevX = e.clientX; prevT = now;
  });

  document.addEventListener('mouseup', () => {
    if (!el) return;
    const target = el;
    el.classList.remove('grabbing'); el = null;
    const glide = () => {
      if (Math.abs(velX) < 0.3) return;
      target.scrollLeft += velX; velX *= 0.90;
      raf = requestAnimationFrame(glide);
    };
    glide();
  });
}
```

CSS 필요:
```css
.carousel { cursor: grab; }
.carousel.grabbing { cursor: grabbing; }
```

## 슬라이드업 패널 (책 상세 등)

```html
<div x-show="selectedBook" x-cloak
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="translate-y-full opacity-0"
     x-transition:enter-end="translate-y-0 opacity-100"
     x-transition:leave="transition ease-in duration-200"
     x-transition:leave-start="translate-y-0 opacity-100"
     x-transition:leave-end="translate-y-full opacity-0"
     class="fixed inset-0 z-30 flex flex-col justify-end">
  <!-- 딤 배경 -->
  <div class="absolute inset-0 bg-black/40" @click="selectedBook=null"></div>
  <!-- 패널 -->
  <div class="relative bg-white rounded-t-3xl ...">...</div>
</div>
```

## 색상 팔레트 (책 커버용)

```js
const bookColors = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];
```
