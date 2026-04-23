import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'file:///' + __dirname.replace(/\\/g, '/');
const OUT = path.join(__dirname, '..', 'images');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };

const wait = ms => new Promise(r => setTimeout(r, ms));

async function shot(page, filename, note) {
  await page.screenshot({ path: path.join(OUT, filename) });
  console.log(`✓ ${filename}  ${note || ''}`);
}

// index.html(로그인 없음)에서 localStorage 설정 후 목표 URL로 이동
async function gotoWithLogin(page, url, role = 'parent') {
  // 리다이렉트 없는 페이지에서 먼저 localStorage 세팅
  await page.goto(`${BASE}/index.html`);
  await page.evaluate((role) => {
    localStorage.setItem('cr_user', JSON.stringify({
      type: role,
      name: role === 'parent' ? '김엄마' : '홍길동',
      email: 'test@example.com'
    }));
    localStorage.setItem('cr_profile', JSON.stringify({
      id: 'hong', name: '홍길동', color: '#667eea',
      age: 11, grade: '초5', gender: '남', level: 4,
      score: 1240, photo: null
    }));
  }, role);
  // 이제 목표 페이지로 이동 (localStorage 이미 설정됨)
  await page.goto(url);
  await wait(1300);
}

// Alpine.js 데이터 직접 조작
async function alpine(page, expr) {
  await page.evaluate((expr) => {
    const el = document.querySelector('[x-data]');
    if (el && el._x_dataStack) {
      const data = el._x_dataStack[0];
      // eslint-disable-next-line no-new-func
      new Function('$data', `with($data){${expr}}`)(data);
    }
  }, expr);
  await wait(600);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // ── 1. 로그인 ────────────────────────────────────────
  await page.goto(`${BASE}/index.html`);
  await wait(900);
  await shot(page, '01-login.png', '로그인 - 부모 탭');

  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.trim() === '학생') b.click();
    });
  });
  await wait(500);
  await shot(page, '02-login-student.png', '로그인 - 학생 탭');

  // ── 2. 프로필 목록 ────────────────────────────────────
  await gotoWithLogin(page, `${BASE}/profiles.html`);
  await shot(page, '03-profiles.png', '프로필 목록 - 나의 프로필');

  // 즐겨찾는 프로필 탭
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.includes('즐겨찾는')) b.click();
    });
  });
  await wait(500);
  await shot(page, '04-profiles-favorites.png', '프로필 목록 - 즐겨찾는 프로필');

  // 프로필 추가 위자드 (나의 프로필 탭으로 돌아와서)
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.includes('나의 프로필')) b.click();
    });
  });
  await wait(300);
  await page.evaluate(() => {
    // openAdd() 트리거 - 점선 카드 클릭
    document.querySelectorAll('[x-data] div').forEach(el => {
      if (el.textContent.includes('프로필 추가') || el.getAttribute('@click') === 'openAdd()') {
        el.click();
      }
    });
    // 직접 Alpine 데이터 조작
    const root = document.querySelector('[x-data]');
    if (root && root.__x) root.__x.$data.openAdd();
    else if (root && root._x_dataStack) {
      root._x_dataStack[0].openAdd?.();
    }
  });
  await wait(700);
  await shot(page, '05-profile-wizard-step1.png', '프로필 추가 위자드 - 색상 선택');

  // 위자드 step2 (닉네임·비밀번호)
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.addStep = 2;
    }
  });
  await wait(500);
  await shot(page, '06-profile-wizard-step2.png', '프로필 추가 위자드 - 닉네임·비밀번호');

  // ── 3. 프로필 상세 ────────────────────────────────────
  await gotoWithLogin(page, `${BASE}/profile-detail.html`);
  await shot(page, '07-profile-detail.png', '프로필 상세');

  // 캘린더 날짜 클릭 → 일별 내역 패널
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      // 읽기 기록 있는 날짜 선택
      if (d.calDays) {
        const day = d.calDays.find(dd => dd.score > 0);
        if (day) d.openDay?.(day);
      }
    }
  });
  await wait(600);
  await shot(page, '08-profile-calendar-day.png', '독서 캘린더 - 일별 내역');

  // 캘린더 닫고 설정 패널 열기
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.dayModal = false;
      d.settingsPanel = true;
    }
  });
  await wait(700);
  await shot(page, '09-profile-settings.png', '프로필 설정 패널');

  // 책 뷰어 설정 하위 패널
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.settingsPanel = true;
      d.settingsSub = 'readdetect';
    }
  });
  await wait(700);
  await shot(page, '10-profile-settings-viewer.png', '프로필 설정 - 책 뷰어 설정');

  // 선호책 설정 하위 패널
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.settingsPanel = true;
      d.settingsSub = 'prefbook';
    }
  });
  await wait(700);
  await shot(page, '11-profile-settings-pref.png', '프로필 설정 - 선호책');

  // ── 4. 서점 ──────────────────────────────────────────
  await gotoWithLogin(page, `${BASE}/bookstore.html`);
  await shot(page, '12-bookstore.png', '서점 메인');

  // 책 상세 열기
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      const book = d.books?.[0] || { id: 'b1', title: "Charlotte's Web" };
      d.openBook?.(book);
    }
  });
  await wait(700);
  await shot(page, '13-bookstore-detail.png', '서점 책 상세');

  // 권장도서 추가 시트 (부모 기능)
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.recommendSheet = true;
    }
  });
  await wait(600);
  await shot(page, '14-bookstore-recommend-sheet.png', '서점 - 권장도서 추가 시트');

  // ── 5. 책장 ──────────────────────────────────────────
  await gotoWithLogin(page, `${BASE}/bookshelf.html`);
  await shot(page, '15-bookshelf-reading.png', '책장 - 읽고 있는 책');

  // 권장도서 탭
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.activeTab = 'must';
    }
  });
  await wait(500);
  await shot(page, '16-bookshelf-recommended.png', '책장 - 권장도서');

  // 책 상세 패널 열기
  await page.evaluate(() => {
    const root = document.querySelector('[x-data]');
    if (root && root._x_dataStack) {
      const d = root._x_dataStack[0];
      d.activeTab = 'reading';
      const book = d.books?.find(b => b.tab === 'reading') || d.readingBooks?.[0];
      if (book) d.openBook?.(book);
      else if (d.selectedBook !== undefined) d.selectedBook = d.books?.[0];
    }
  });
  await wait(600);
  await shot(page, '17-bookshelf-detail.png', '책장 - 책 상세 패널');

  // ── 6. 책 뷰어 (읽기 단계) ───────────────────────────
  await gotoWithLogin(page, `${BASE}/reader.html?skip_calib=1`);
  await wait(1500);
  await shot(page, '18-reader.png', '책 뷰어 - 읽기 화면');

  // 캘리브레이션 화면도 별도 캡처
  await gotoWithLogin(page, `${BASE}/reader.html`);
  await wait(1000);
  await shot(page, '19-reader-calibration.png', '책 뷰어 - 시선 보정');

  // ── 7. 소통 ──────────────────────────────────────────
  await gotoWithLogin(page, `${BASE}/chat.html`);
  await shot(page, '20-chat-list.png', '소통 - 채팅 목록');

  // 채팅방 열기
  await page.evaluate(() => {
    const btn = document.querySelector('button[\\@click*="openRoom"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('홍길동') || b.textContent.includes('채팅'));
    if (btn) btn.click();
  });
  await wait(700);
  await shot(page, '21-chat-room.png', '소통 - 채팅방');

  // ── 8. 내 정보 ───────────────────────────────────────
  await gotoWithLogin(page, `${BASE}/myinfo.html`);
  await shot(page, '22-myinfo.png', '내 정보 - 부모');

  await browser.close();
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n완료! ${files.length}장 → ${OUT}`);
})();
