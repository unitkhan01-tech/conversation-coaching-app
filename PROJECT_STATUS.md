# PROJECT_STATUS.md

## 1. 현재 프로젝트 상태

프로젝트명:

대화코칭어플

현재 단계:

로컬 MVP v0.1 검수 단계

현재 상태:

정적 웹앱 MVP가 생성되었고, 브라우저에서 index.html을 직접 열어 기본 기능을 테스트할 수 있다.

## 2. 현재 파일 구성

현재 루트 폴더에는 아래 파일들이 있다.

### 기획·철학 문서

- AGENTS.md
- MASTER_SPEC.md
- MVP_IMPLEMENTATION_PLAN.md

### 화면·데이터 문서

- UI_WIREFRAME.md
- DATA_STRUCTURE.md

### 검수 문서

- QA_CHECKLIST.md
- TEST_SCENARIOS.md
- LOCAL_MVP_FINAL_QA.md

### AI 연결 준비 문서

- AI_OUTPUT_SPEC.md
- PROMPT_POLICY.md
- AI_API_READINESS_CHECKLIST.md
- AI_INTEGRATION_PLAN.md

### 앱 파일

- index.html
- style.css
- app.js

## 3. 현재 구현된 기능

현재 앱에는 아래 기능이 있다.

- 상황 입력
- 상대방 메시지 입력
- 답장 의도 선택
- 예시로 채우기
- 다시 쓰기
- 테스트 상황 불러오기
- 답장 방향 보기
- 상황 정리 출력
- 답장 후보 3개 출력
- 답장 복사
- 복사 완료 안내

## 4. 아직 하지 않은 것

아래 기능은 아직 구현하지 않았다.

- 로그인
- 회원가입
- 결제
- DB 저장
- 배포
- 모바일 앱 전환
- 실제 AI API 연결
- 서버 구현
- 서버리스 함수 구현
- API 키 설정
- 사용자 기록 저장
- 관리자 페이지

## 5. 중요한 원칙

현재 프로젝트의 핵심 원칙은 아래와 같다.

- 이 앱은 상대를 조종하는 앱이 아니다.
- 밀당 기술을 가르치지 않는다.
- 사용자의 불안을 키우지 않는다.
- 상대방의 마음을 단정하지 않는다.
- 사용자가 덜 후회할 답장을 고르도록 돕는다.
- 사용자 화면에는 strategy_summary와 recommendations만 보여준다.
- internal_evaluation은 사용자에게 노출하지 않는다.

## 6. 다음 의사결정

다음 단계에서 결정해야 할 것은 아래 중 하나다.

1. 로컬 MVP 품질을 더 다듬을지
2. UI를 조금 더 보기 좋게 개선할지
3. AI 연결 준비로 넘어갈지
4. 서버 구조를 선택할지

현재 권장 방향:

먼저 LOCAL_MVP_FINAL_QA.md 기준으로 브라우저에서 6개 테스트 시나리오를 직접 확인한다.
그 결과 문제가 없으면 로컬 MVP v0.1을 임시 확정한다.
