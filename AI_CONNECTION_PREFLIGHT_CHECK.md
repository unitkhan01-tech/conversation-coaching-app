# AI 연결 프리플라이트 점검

## 1. 현재 상태

현재 프로젝트는 AI 연결을 위한 기본 구조를 갖추었다.

**생성된 주요 파일**

- package.json
- .env.example
- api/generate-reply.js
- app.js

현재 app.js는 `/api/generate-reply` 호출을 시도할 수 있다.  
다만 로컬에서 index.html을 직접 열면 서버리스 함수가 실행되지 않을 수 있으므로, 이 경우 로컬 fallback이 작동하는 것이 정상이다.

## 2. 아직 하지 않은 것

아래 작업은 아직 하지 않았다.

- 실제 API 키 입력
- 실제 AI API 호출
- Vercel 배포
- 환경변수 설정
- 서버리스 함수 실행 테스트
- OpenAI 모델명 최종 확정
- 결제/로그인/DB 연결

## 3. 반드시 지킬 것

아래는 절대 금지한다.

- OPENAI_API_KEY를 app.js에 넣기
- OPENAI_API_KEY를 index.html에 넣기
- OPENAI_API_KEY를 문서 파일에 적기
- OPENAI_API_KEY를 GitHub에 올리기
- API 키를 브라우저 콘솔에 출력하기
- AI 응답 원문 전체를 사용자 화면에 노출하기
- internal_evaluation을 사용자 화면에 노출하기

## 4. 실제 연결 전 확인할 것

실제 AI 연결 전에 아래를 확인한다.

1. app.js가 fallback을 유지하고 있는가
2. api/generate-reply.js가 API 키를 process.env.OPENAI_API_KEY에서만 읽는가
3. .env.example에는 실제 키가 없는가
4. OpenAI 모델명은 실제 사용 가능한 모델명으로 설정할 준비가 되었는가
5. Vercel 환경변수에 API 키를 넣을 계획인가
6. 사용자 화면에 internal_evaluation이 표시되지 않는가
7. AI 실패 시 fallback 또는 쉬운 안내 문구가 표시되는가

## 5. 현재 위험 요소

현재 위험 요소는 아래와 같다.

### 모델명 확인 필요

.env.example에 있는 OPENAI_MODEL 값은 실제 연결 전 다시 확인해야 한다.  
사용 가능한 모델명은 OpenAI 공식 Models 문서를 기준으로 정한다.

### 로컬 파일 실행 한계

index.html을 파일로 직접 열면 `/api/generate-reply` 서버리스 함수는 실행되지 않을 수 있다.  
따라서 실제 AI 호출 테스트는 Vercel 배포 또는 적절한 로컬 서버 환경에서 해야 한다.

### 비개발자 작업 위험

사용자가 코딩을 모르므로, 터미널 실행이나 배포 단계는 반드시 별도 안내 후 진행해야 한다.

## 6. 다음 단계

다음 단계는 아래 중 하나다.

1. Vercel 계정과 프로젝트 연결 준비
2. GitHub 저장소 준비 여부 결정
3. Vercel 환경변수 설정 절차 준비
4. 실제 AI API 키 발급 및 보관 방식 결정
5. 배포 전 파일 구조 최종 점검

## 7. 현재 결론

AI 연결 준비는 시작되었다.

하지만 아직 실제 AI 연결을 시작하지 않는다.  
API 키 보안과 배포 구조를 먼저 확정한 뒤 진행한다.
