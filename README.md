# 오늘 뭐 입지? — 날씨 기반 OOTD 다이어리 (다크 에디토리얼)

## VS Code에서 실행하기

1. 이 폴더를 VS Code로 열기
2. 터미널(⌃`)에서 의존성 설치
   ```
   npm install
   ```
3. 개발 서버 실행
   ```
   cd ootd-diary
   npm run dev
   ```
4. 터미널에 뜨는 주소(보통 http://localhost:5173)를 브라우저로 열기

## 폴더 구조

```
ootd-diary/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx      # 진입점
    ├── App.jsx        # 전체 화면(날씨 + 코디 추천 + 캘린더 + 기록 시트) 로직
    └── index.css      # 폰트 및 전역 스타일
```

## 디자인

- 다크 배경(`#0c0c0c`) + 라임 포인트 컬러(`#d4ff50`)의 에디토리얼 스타일
- 디스플레이 서체: Barlow Condensed / 본문 서체: Instrument Sans
- 아이콘 없이 기호(◎ ◑ ↓ ∗ ≋, ▲ — ▼)로 날씨·체감을 표현

## 참고

- 날씨는 API 키가 필요 없는 Open-Meteo(open-meteo.com)를 사용해요. 위치 권한을 거부하면 서울 기준으로 표시돼요.
- 기록은 브라우저 localStorage에 저장돼요. 나중에 서버에 저장하고 싶으면 `src/App.jsx`의 `loadRecords` / `saveRecords` 함수만 API 호출로 바꾸면 돼요.
- 별도 아이콘 라이브러리 없이 순수 텍스트/기호와 인라인 스타일로 구현했어요.
