import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // base: "/-/", // GitHub Pages 등 서브 경로 배포 시에만 주석 해제. 로컬 개발/폰 설치 테스트 중엔 꺼두세요.
});
