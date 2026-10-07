# 오늘 뭐 입지? — 날씨 기반 OOTD 다이어리 (다크 에디토리얼)

날씨와 대기질에 맞춰 오늘 입을 옷을 추천받고, 실제로 입은 코디와 온도감을 기록하는 PWA 앱이에요. 옷차림 추천은 로컬 규칙 기반 로직을 기본으로 하고, Gemini API가 연결되어 있으면 AI 추천으로 대체돼요.

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

> ⚠️ `npm run dev`(Vite 개발 서버)만으로는 `/api/recommend`(AI 추천)가 동작하지 않아요. 이 라우트는 Vercel 서버리스 함수라서, 로컬에서 AI 추천까지 확인하려면 Vercel CLI로 `vercel dev`를 쓰거나, 실제로 Vercel에 배포해서 테스트해야 해요. `npm run dev`로는 AI 호출이 실패하고 로컬 규칙 기반 추천으로 자동 대체돼요(화면 라벨이 "AI 추천"이 아니라 "TODAY'S PICK"으로 뜨면 이 상태예요).

## Vercel에 배포하기

1. GitHub 저장소를 Vercel 프로젝트에 연결 (Framework Preset: Vite, Build Command/Output Directory는 자동 감지된 기본값 그대로 사용)
2. Vercel 프로젝트 **Settings → Environment Variables**에 `GEMINI_API_KEY` 등록 (Google AI Studio에서 발급)
3. `main` 브랜치에 push하면 자동으로 재배포됨
4. 배포 후에도 화면이 안 바뀌면, 브라우저 개발자도구 → Application → Service Workers에서 **Unregister** + Storage → **Clear site data** 후 새로고침 (이 앱은 PWA라서 서비스워커가 예전 버전을 캐싱하고 있을 수 있어요)

## 폴더 구조

```
ootd-diary/
├── index.html
├── package.json
├── vite.config.js
├── api/
│   └── recommend.js          # Vercel 서버리스 함수 — Gemini API로 옷차림 추천 생성
├── public/
│   ├── manifest.webmanifest  # PWA 매니페스트
│   └── sw.js                 # 서비스워커 (오프라인/캐싱)
└── src/
   ├── main.jsx                  # React 진입점
   ├── App.jsx                   # 메인 화면 조합 및 앱 상태 (로그인 화면 포함)
   ├── index.css                 # 폰트 및 전역 스타일
   ├── constants.js              # 디자인 토큰과 공통 상수
   ├── components/
   │   ├── common.jsx            # 공통 UI 컴포넌트
   │   ├── ProfileSheet.jsx      # 추천 기준 설정
   │   ├── RecordSheet.jsx       # 착장 기록 입력
   │   ├── SearchSheets.jsx      # 기록·지역 검색
   │   └── WardrobeSheet.jsx     # 내 옷장 관리
   ├── hooks/
   │   └── useWeather.js         # 날씨·대기질·위치 요청과 시간별 예보 (시간대별 체감/습도/바람 포함)
   └── lib/
      ├── date.js               # 날짜·시간대·계절·온도 유틸리티
      ├── locationApi.js        # 도시 검색·역지오코딩 API
      ├── storage.js            # localStorage 저장·복원
      └── wardrobe.js           # 옷장 관련 상수
```

## AI 옷차림 추천

- `api/recommend.js`가 그날 날씨(기온/체감/강수확률/습도/바람)와 프로필을 바탕으로 Gemini API에 옷차림 추천을 요청해요.
- 현재 사용 모델: `gemini-3.5-flash-lite` (Google이 모델을 종료/변경하면 `api/recommend.js`의 모델명을 새 모델로 교체해야 해요)
- 시간대 선택 바에서 다른 시간을 고르면, 그 시간 기준으로 추천이 다시 계산돼요 (큰 온도 숫자·헤드라인·옷차림·경보 문구 전부 동일하게 반영)
- 눈이 예보된 시간에는 미끄럼 방지 방한 부츠와 방한 장갑을 우선 추천하고, 빙판길 주의 경보를 표시해요.
- AI 호출이 실패하거나 `GEMINI_API_KEY`가 없으면 자동으로 로컬 규칙 기반 추천(`outfitFor` 함수)으로 대체돼요. 이 경우 라벨이 "AI 추천"이 아니라 "TODAY'S PICK"으로 표시돼요.

## 로그인 화면

- Supabase Auth로 이메일/비밀번호 가입 및 로그인, 이메일 확인, 비밀번호 재설정을 지원해요.
- 기록·프로필·즐겨찾기·옷장·온도 단위는 로그인한 사용자별로 분리되어 Supabase에 동기화돼요. 첫 로그인 시 서버에 데이터가 없으면 기존 브라우저의 익명 데이터를 해당 계정으로 한 번 이전해요.
- 클라우드 데이터는 `supabase/schema.sql`의 `user_app_data` 테이블에 저장되며, RLS 정책으로 각 계정은 자신의 데이터에만 접근할 수 있어요. 브라우저에는 공개 anon/publishable 키만 사용하고 service-role 키를 넣지 마세요.

### Supabase 설정

1. Supabase에서 프로젝트를 만든 뒤 **SQL Editor**에서 `supabase/schema.sql` 전체를 실행해요.
2. Supabase **Authentication → URL Configuration**에서 Site URL을 배포된 앱 주소로 설정하고, Redirect URLs에 배포 주소와 로컬 주소(`http://localhost:5173/**`)를 추가해요.
3. 로컬 개발은 `.env.example`을 `.env.local`로 복사한 뒤 Supabase Project URL과 anon/publishable key를 각각 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`에 입력해요. `.env.local`은 저장소에 올리지 마세요.
4. Vercel의 **Settings → Environment Variables**에도 같은 두 변수를 등록하고 재배포해요. 공개 anon/publishable 키만 사용하며 `service_role` 키는 절대 프론트엔드에 추가하지 마세요.
5. 처음 로그인할 때 기존 브라우저의 로컬 데이터가 새 계정으로 이전돼요. 다른 계정에 로그인하면 계정별 데이터가 별도로 로드돼요.

## 디자인

- 다크 배경(`#0c0c0c`) + 라임 포인트 컬러(`#d4ff50`)의 에디토리얼 스타일
- 디스플레이 서체: Barlow Condensed / 본문 서체: Instrument Sans
- 아이콘 없이 기호(▲ — ▼, ☀ ☁ ☂ ☾)로 날씨·체감을 표현. 강수확률 45% 이상이거나 비/이슬비 계열 날씨 코드면 우산(☂), 19시 이후엔 밤 기호(☾)로 자동 전환

## 참고

- 날씨는 API 키가 필요 없는 Open-Meteo(open-meteo.com)를 사용해요. 위치 권한을 거부하면 서울 기준으로 표시돼요.
- 기록·프로필·즐겨찾기·옷장은 브라우저 `localStorage`에 저장돼요. 저장 로직은 `src/lib/storage.js`에서 관리해요.
- 도시 검색은 Open-Meteo 지오코딩 API를 사용하고, 위치 권한을 허용하면 역지오코딩으로 현재 지역을 표시해요.
- 날씨와 대기질(PM10/PM2.5 수치 및 등급) 정보는 `src/hooks/useWeather.js`에서 Open-Meteo API로 가져와요. 위치 권한을 거부하면 서울 기준으로 표시돼요.
- 공휴일은 Nager.Date 공개 API에서 달력의 연도별 정보를 가져와요. API에 연결할 수 없으면 달력에 안내 문구를 표시해요.
- 별도 아이콘 라이브러리 없이 순수 텍스트/기호와 인라인 스타일로 구현했어요.
