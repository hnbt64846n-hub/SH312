# 아이랑 나가요 - Part A (단일 HTML MVP)

> 영유아 외출 준비물을 효율적으로 관리하는 PWA 체크리스트 앱

## 📱 기능

- ✅ 아이 정보에 따른 맞춤형 체크리스트 자동 생성
- 🔗 URL을 통한 체크리스트 공유
- 📵 오프라인 모드 완벽 지원
- 🔔 브라우저 알림 기능
- 💾 로컬 저장소에 자동 저장
- 🎨 반응형 디자인 (모든 화면 크기 지원)

## 🚀 배포 방법

### Vercel + GitHub 연동 배포 (권장)

1. https://vercel.com 접속 후 GitHub 계정으로 로그인
2. "Add New" → "Project" → 이 저장소 선택
3. 설정값 기본값 유지 (Framework: Other, Build/Output 비워두기)
4. "Deploy" 클릭

이후 `main` 브랜치에 커밋을 푸시하면 Vercel이 자동으로 재배포합니다.

### 로컬에서 실행

```bash
# Python 내장 서버 사용
python3 -m http.server 8000

# 또는 Node.js http-server
npx http-server
```

브라우저에서 `http://localhost:8000` 접속

## 📁 파일 구조

```
.
├── index.html              # 메인 HTML 파일 (모든 코드 포함)
├── manifest.webmanifest    # PWA 매니페스트
├── sw.js                   # Service Worker (오프라인 지원)
├── icons/
│   ├── icon-192.png        # 앱 아이콘 (작음)
│   └── icon-512.png        # 앱 아이콘 (큼)
└── README.md                # 이 파일
```

## 💻 기술 스택

- HTML5
- CSS3 (Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- Service Workers (PWA)
- LocalStorage

## 🔧 개발

### 수정 방법
1. `index.html` 파일을 에디터로 열기
2. CSS는 `<style>` 태그 내에서 수정
3. JavaScript는 `<script>` 태그 내에서 수정
4. 파일 저장 후 브라우저 새로고침 (Ctrl+R 또는 Cmd+R)

### 빌드 및 배포

```bash
# 1. Git 커밋
git add .
git commit -m "feat: 기능 설명"

# 2. GitHub에 푸시
git push origin main

# 3. Vercel은 자동으로 배포됨 (GitHub 연동 시)
```

## 📱 모바일 설치

### Android
```
1. Chrome에서 배포된 URL 접속
2. ⋮ (메뉴) → "앱 설치"
3. "설치" 클릭
```

### iOS
```
1. Safari에서 배포된 URL 접속
2. ↑ (공유) → "홈 화면에 추가"
3. "추가" 클릭
```

## 🐛 문제 해결

### "앱 설치 옵션이 없어요"
- HTTPS URL 사용 확인 (Vercel은 자동으로 HTTPS)
- 캐시 삭제 후 새로고침
- 최신 브라우저 버전 확인

### "오프라인에서 작동 안 해요"
- 앱을 먼저 온라인에서 한 번 열기
- Service Worker가 등록되면 오프라인에서도 작동

## 📊 성능

- 파일 크기: ~30KB
- 초기 로딩 시간: <1초
- 오프라인 지원: ✅

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능
