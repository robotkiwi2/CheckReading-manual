import fs from 'fs';

const files = [
  'bookshelf.html',
  'bookstore.html',
  'chat.html',
  'myinfo.html',
  'profiles.html',
  'profile-detail.html',
];

const dir = 'C:/Users/robot/BNR/리더스아이 개발 - 문서/94. CheckReading gitbook Manual/prototype/';

for (const file of files) {
  const path = dir + file;
  let html = fs.readFileSync(path, 'utf8');

  // 1. nav 요소에 safe-area padding 추가
  html = html.replace(
    /(<nav[^>]*class="lg:hidden flex-shrink-0 bg-white border-t border-gray-100 flex")/g,
    '$1 style="padding-bottom: env(safe-area-inset-bottom)"'
  );

  // 2. nav 아이템 패딩/갭 키우기 (py-2 gap-0.5 → py-3 gap-1)
  //    nav 내부 링크 클래스에만 적용되도록 flex flex-col items-center 패턴으로 범위 한정
  html = html.replace(/flex flex-col items-center py-2 gap-0\.5/g, 'flex flex-col items-center py-3 gap-1');

  // 3. nav 아이콘 사이즈 키우기 (w-5 h-5 → w-6 h-6) — nav 섹션 내에서만
  //    nav 태그 사이의 내용에서만 교체
  html = html.replace(
    /(<nav[\s\S]*?<\/nav>)/g,
    (navBlock) => navBlock.replace(/class="w-5 h-5"/g, 'class="w-6 h-6"')
  );

  // 4. 탭 레이블 텍스트 키우기 (text-[10px] → text-xs)
  html = html.replace(
    /(<nav[\s\S]*?<\/nav>)/g,
    (navBlock) => navBlock.replace(/text-\[10px\]/g, 'text-xs')
  );

  // 5. viewport에 viewport-fit=cover 추가 (safe-area 동작에 필요)
  html = html.replace(
    /(<meta name="viewport" content="[^"]*)(">)/,
    (match, p1, p2) => {
      if (p1.includes('viewport-fit')) return match;
      return p1 + ', viewport-fit=cover' + p2;
    }
  );

  fs.writeFileSync(path, html, 'utf8');
  console.log(`updated: ${file}`);
}
