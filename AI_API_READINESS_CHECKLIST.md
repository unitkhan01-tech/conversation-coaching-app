# AI_API_READINESS_CHECKLIST.md

## 1. 목적

이 문서는 대화코칭어플에 실제 AI API를 연결하기 전에 반드시 확인해야 할 사항을 정리한다.

현재 MVP는 정적 웹앱 구조다.

현재 파일 구조:

- index.html
- style.css
- app.js

이 구조에서는 API 키를 안전하게 숨길 수 없다.
따라서 실제 AI API를 연결하려면 별도의 서버 또는 서버리스 함수가 필요하다.

## 2. 절대 금지

아래 작업은 절대 하지 않는다.

- OpenAI API 키를 app.js에 직접 넣기
- OpenAI API 키를 index.html에 직접 넣기
- OpenAI API 키를 브라우저에서 보이는 코드에 넣기
- GitHub 등에 API 키가 포함된 파일 올리기
- 사용자 입력 내용을 아무 검수 없이 AI에 전달하기
- AI 응답 전체를 그대로 사용자에게 노출하기
- internal_evaluation을 사용자 화면에 노출하기

## 3. API 키 보안 원칙

AI API 키는 브라우저 코드에 들어가면 안 된다.

API 키는 아래 위치 중 하나에만 있어야 한다.

- 서버 환경 변수
- 서버리스 함수 환경 변수
- 배포 플랫폼의 Secret / Environment Variable 설정

초기 비개발자 단계에서는 API 키를 직접 다루기 전에 구조를 먼저 정해야 한다.

## 4. AI 연결 전 필수 조건

AI API를 연결하기 전에 아래가 준비되어야 한다.

1. AI_OUTPUT_SPEC.md가 확정되어 있어야 한다.
2. PROMPT_POLICY.md가 확정되어 있어야 한다.
3. QA_CHECKLIST.md가 있어야 한다.
4. TEST_SCENARIOS.md가 있어야 한다.
5. internal_evaluation은 화면에 노출되지 않아야 한다.
6. recommendations는 항상 3개로 고정되어야 한다.
7. strategy_summary와 recommendations만 사용자에게 보여야 한다.
8. API 키를 숨길 서버 구조가 결정되어야 한다.

## 5. 현재 MVP에서 확인된 것

현재 MVP는 아래를 만족한다.

- 사용자가 현재 상황을 입력할 수 있다.
- 상대방 메시지를 입력할 수 있다.
- 사용자의 답장 의도를 선택할 수 있다.
- 테스트 시나리오를 불러올 수 있다.
- strategy_summary를 보여줄 수 있다.
- recommendations 3개를 보여줄 수 있다.
- 답장 복사 기능이 있다.
- internal_evaluation은 화면에 노출하지 않는다.

## 6. 아직 부족한 것

실제 AI 연결 전 아래가 부족하다.

- 서버 구조 없음
- API 키 보관 구조 없음
- AI 요청/응답 검증 로직 없음
- AI 응답 실패 시 fallback 처리 없음
- 금지 문장 필터링 없음
- 사용량 제한 없음
- 에러 메시지 정책 없음

## 7. AI 응답 검수 기준

AI 응답은 아래 기준을 통과해야 한다.

- 상대방 마음을 단정하지 않는다.
- 조종, 밀당, 질투 유발을 권하지 않는다.
- 사용자의 불안을 키우지 않는다.
- 답장이 실제로 보낼 수 있을 정도로 짧고 자연스럽다.
- recommendations 3개가 서로 구분된다.
- 선을 긋는 답장이 공격적이지 않다.
- strategy_summary와 recommendations 방향이 충돌하지 않는다.
- internal_evaluation이 사용자 화면에 노출되지 않는다.

## 8. API 연결 전 최종 통과 기준

아래 조건을 모두 만족하면 AI API 연결을 검토할 수 있다.

- 현재 로컬 MVP가 안정적으로 작동한다.
- 테스트 시나리오 6개가 모두 실행 가능하다.
- 금지 문장 유형이 문서화되어 있다.
- AI 출력 구조가 문서화되어 있다.
- API 키를 숨길 구조를 정했다.
- 사용자가 API 키를 직접 코드에 붙여넣지 않도록 절차가 설계되어 있다.
