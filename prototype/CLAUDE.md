# CheckReading 프로토타입 작업 가이드

이 폴더에서 작업을 시작할 때 아래 세 파일을 순서대로 읽으세요.

1. **SERVICE.md** — 서비스 개념·용어·기능·데이터 구조 전체 정리
2. **DESIGN.md** — 기술 스택, 공통 UI 패턴, 각 화면 구현 세부사항
3. **TODO.md** — 완료된 작업 목록 + 미완성 항목

## 작업 규칙

- 파일 수정 후 확인 없이 즉시 `git add → commit → push` 진행
- GitHub repo: `robotkiwi2/CheckReading-manual`, branch `main`, 경로 `/prototype/`
- 작업 완료 후 TODO.md와 DESIGN.md를 최신 상태로 업데이트

## 파일 목록

| 파일 | 설명 |
|------|------|
| `index.html` | 로그인 |
| `profiles.html` | 자녀 프로필 목록 + 실시간 모니터링 |
| `profile-detail.html` | 프로필 상세 (통계, 캘린더, 설정) |
| `bookstore.html` | 서점 (캐러셀, 추천선반, 책 상세) |
| `bookshelf.html` | 책장 (탭 4종, 선택 삭제) |
| `chat.html` | 소통 (채팅) |
| `myinfo.html` | 내 정보 (학생/부모 분기) |
| `reader.html` | 책 뷰어 (캘리브레이션 + 읽기 컨트롤러) |
