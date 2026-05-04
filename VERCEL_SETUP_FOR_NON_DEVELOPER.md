# 비개발자용 Vercel 준비 안내

## 1. 목적

이 문서는 코딩을 모르는 사용자가 Vercel을 통해 대화코칭어플의 AI 서버리스 구조를 안전하게 연결하기 위한 준비 문서다.

이 문서는 실행 명령어를 제공하지 않는다.  
아직 터미널을 사용하지 않는다.

## 2. 왜 Vercel이 필요한가

현재 앱은 브라우저에서 index.html을 직접 여는 정적 웹앱이다.

하지만 실제 AI API를 연결하려면 API 키가 필요하다.  
API 키는 브라우저 코드에 들어가면 안 된다.

Vercel을 사용하면 API 키를 Environment Variables에 숨기고, `/api/generate-reply` 같은 서버리스 함수를 통해 안전하게 AI를 호출할 수 있다.

## 3. 비개발자 기준 준비물

실제 연결 전에 필요한 것은 아래와 같다.

1. Vercel 계정
2. GitHub 계정 또는 Vercel에 프로젝트를 올릴 방법
3. OpenAI API 키
4. Vercel Environment Variables 설정
5. 배포된 웹 주소

단, API 키는 절대 코드 파일에 적지 않는다.

## 4. 앞으로 해야 할 큰 흐름

전체 흐름은 아래 순서로 진행한다.

1. 프로젝트 파일 정리
2. GitHub 또는 Vercel 업로드 방식 선택
3. Vercel 프로젝트 생성
4. Environment Variables에 OPENAI_API_KEY 추가
5. OPENAI_MODEL 추가
6. 배포
7. 배포된 주소에서 테스트
8. 결과 품질 검수

## 5. 사용자가 누르면 안 되는 것

아래는 의미를 모르고 누르지 않는다.

- Run
- Terminal
- npm install
- npm run
- npx
- Deploy 버튼
- Git commit
- API key를 코드에 붙여넣기

배포 단계에서는 반드시 안내를 받은 뒤 진행한다.

## 6. API 키 보관 원칙

API 키는 아래 위치에만 넣는다.

- Vercel Project Settings
- Environment Variables
- OPENAI_API_KEY 값

**API 키를 넣으면 안 되는 곳**

- index.html
- app.js
- style.css
- README
- 문서 파일
- Cursor 채팅창
- GitHub 공개 저장소

## 7. OpenAI 모델명

OPENAI_MODEL은 실제 연결 전 OpenAI 공식 문서 기준으로 확인한다.

.env.example의 모델명은 예시값이며, 실제 사용 가능한 값으로 바꿔야 할 수 있다.

## 8. 실제 연결 전 체크리스트

실제 연결 전 아래를 확인한다.

- api/generate-reply.js가 존재한다.
- package.json이 존재한다.
- .env.example에는 실제 키가 없다.
- app.js는 fallback을 유지한다.
- 브라우저 화면은 로컬 fallback으로 계속 작동한다.
- 사용자는 API 키를 코드에 붙여넣지 않는다.

## 9. 다음 의사결정

다음에는 아래 중 하나를 결정해야 한다.

1. GitHub를 통해 Vercel에 올릴 것인가
2. Vercel에 직접 프로젝트를 올릴 것인가
3. 아직 AI 연결 전 품질을 더 다듬을 것인가

## 10. 현재 결론

Vercel 서버리스 구조는 현재 프로젝트에 적합하다.

하지만 비개발자 사용자가 실수로 API 키를 노출하지 않도록, 실제 배포와 API 키 설정은 별도 단계로 분리해서 진행한다.
