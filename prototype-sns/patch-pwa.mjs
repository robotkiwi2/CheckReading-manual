import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/robot/BNR/리더스아이 개발 - 문서/94. CheckReading gitbook Manual/prototype/';

const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(dir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. black-translucent → black
  if (html.includes('black-translucent')) {
    html = html.replace(/black-translucent/g, 'black');
    changed = true;
  }

  // 2. viewport-fit=cover 제거
  if (html.includes('viewport-fit=cover')) {
    html = html.replace(/,?\s*viewport-fit=cover/g, '');
    changed = true;
  }

  // 3. nav의 safe-area padding 제거 (iOS가 자동 처리하므로 불필요)
  if (html.includes('padding-bottom: env(safe-area-inset-bottom)')) {
    html = html.replace(/ style="padding-bottom: env\(safe-area-inset-bottom\)"/g, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`patched: ${file}`);
  }
}
