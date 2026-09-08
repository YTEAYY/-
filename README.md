# 오늘 뭐 입지? — 날씨 기반 OOTD 다이어리 (다크 에디토리얼)

## VS Code에서 실행하기

1. 이 폴더를 VS Code로 열기
2. 터미널(⌃`)에서 의존성 설치
   ```
   npm install
   ```
3. 개발 서버 실행
   ```
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
   ├── main.jsx                  # React 진입점
   ├── App.jsx                   # 메인 화면 조합 및 앱 상태
   ├── index.css                 # 폰트 및 전역 스타일
   ├── constants.js              # 디자인 토큰과 공통 상수
   ├── components/
   │   ├── common.jsx            # 공통 UI 컴포넌트
   │   ├── ProfileSheet.jsx      # 추천 기준 설정
   │   ├── RecordSheet.jsx       # 착장 기록 입력
   │   ├── SearchSheets.jsx      # 기록·지역 검색
   │   └── WardrobeSheet.jsx     # 내 옷장 관리
   ├── hooks/
   │   └── useWeather.js         # 날씨·대기질·위치 요청과 시간별 예보
   └── lib/
      ├── date.js               # 날짜·시간대·계절·온도 유틸리티
      ├── locationApi.js        # 도시 검색·역지오코딩 API
      ├── storage.js            # localStorage 저장·복원
      └── wardrobe.js           # 옷장 관련 상수
```

## 디자인

- 다크 배경(`#0c0c0c`) + 라임 포인트 컬러(`#d4ff50`)의 에디토리얼 스타일
- 디스플레이 서체: Barlow Condensed / 본문 서체: Instrument Sans
- 아이콘 없이 기호(▲ — ▼)로 날씨·체감을 표현

## 참고

- 날씨는 API 키가 필요 없는 Open-Meteo(open-meteo.com)를 사용해요. 위치 권한을 거부하면 서울 기준으로 표시돼요.
- 기록·프로필·즐겨찾기·옷장은 브라우저 `localStorage`에 저장돼요. 저장 로직은 `src/lib/storage.js`에서 관리해요.
- 도시 검색은 Open-Meteo 지오코딩 API를 사용하고, 위치 권한을 허용하면 역지오코딩으로 현재 지역을 표시해요.
- 날씨와 대기질 정보는 `src/hooks/useWeather.js`에서 Open-Meteo API로 가져와요. 위치 권한을 거부하면 서울 기준으로 표시돼요.
- 공휴일은 Nager.Date 공개 API에서 달력의 연도별 정보를 가져와요. API에 연결할 수 없으면 달력에 안내 문구를 표시해요.
- 별도 아이콘 라이브러리 없이 순수 텍스트/기호와 인라인 스타일로 구현했어요.
