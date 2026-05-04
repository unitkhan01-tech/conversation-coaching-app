# DEPLOYMENT_SAFETY_CHECK.md

## 1. 목적

이 문서는 GitHub 또는 Vercel로 프로젝트를 올리기 전에 API 키와 민감 정보가 노출되지 않도록 점검하기 위한 문서다.

## 2. 현재 배포 전 필수 점검

배포 전 아래를 확인한다.

- .gitignore 파일이 존재한다.
- .env가 .gitignore에 포함되어 있다.
- .env.local이 .gitignore에 포함되어 있다.
- node_modules가 .gitignore에 포함되어 있다.
- .vercel이 .gitignore에 포함되어 있다.
- .env.example에는 실제 API 키가 없다.
- app.js에는 API 키가 없다.
- index.html에는 API 키가 없다.
- api/generate-reply.js에는 API 키가 직접 적혀 있지 않다.
- api/generate-reply.js는 process.env.OPENAI_API_KEY만 사용한다.
- api/generate-reply.js는 process.env.OPENAI_MODEL만 사용한다.
- 실제 모델명은 OpenAI 공식 문서 확인 후 Vercel 환경변수에 넣는다.

## 3. 절대 GitHub에 올라가면 안 되는 것

아래 파일이나 정보는 GitHub에 올라가면 안 된다.

- .env
- .env.local
- 실제 OPENAI_API_KEY 값
- 개인 API 키
- 결제 정보
- 개인 계정 정보
- 민감한 사용자 대화 기록

## 4. GitHub에 올라가도 되는 것

아래는 올라가도 된다.

- .env.example
- package.json
- index.html
- style.css
- app.js
- api/generate-reply.js
- 문서 파일들

단, 문서 파일에도 실제 API 키가 없어야 한다.

## 5. Vercel 환경변수에 넣을 것

Vercel Project Settings의 Environment Variables에는 아래 값을 넣는다.

- OPENAI_API_KEY
- OPENAI_MODEL

실제 값은 코드 파일에 넣지 않는다.

## 6. 현재 결론

GitHub/Vercel로 이동하기 전, 이 파일의 체크리스트를 통과해야 한다.

API 키가 코드에 들어가지 않는 것이 가장 중요하다.
