# V10 AI 아키텍처 계획

## 1. 목적

이 문서는 대화코칭어플을 하드코딩 후보 풀 방식에서 AI 기반 관계 목표형 생성 구조로 전환하기 위한 설계 문서다.

현재 앱은 정적 웹앱이다.

현재 앱 파일:

- index.html
- style.css
- app.js

이 구조는 브라우저에서 직접 실행된다.  
따라서 AI API 키를 안전하게 숨길 수 없다.

## 2. 핵심 전환 방향

**기존 구조**

사용자 입력  
→ app.js 하드코딩 후보 풀  
→ 답장 후보 3개 출력

**v1.0 구조**

사용자 입력  
→ 프론트엔드  
→ 안전한 서버 또는 서버리스 함수  
→ AI API  
→ 응답 검증  
→ 프론트엔드 출력

## 3. 왜 서버가 필요한가

AI API 키는 브라우저 코드에 넣으면 안 된다.

브라우저에서 보이는 코드에 API 키를 넣으면 외부에 노출될 수 있다.

따라서 API 키는 아래 위치에 있어야 한다.

- 서버 환경 변수
- 서버리스 함수 환경 변수
- 배포 플랫폼의 Secret / Environment Variable

## 4. 추천 구조

초기에는 아래 구조가 적합하다.

1. 현재 HTML/CSS/JS 프론트엔드는 유지한다.
2. AI 호출만 별도 서버리스 함수로 분리한다.
3. 프론트엔드는 `/api/generate-reply` 같은 안전한 endpoint를 호출한다.
4. 서버리스 함수가 AI API를 호출한다.
5. 서버리스 함수가 AI 응답을 검증한다.
6. 프론트엔드는 검증된 결과만 화면에 표시한다.

## 5. AI 요청 입력값

AI에게 전달할 입력값은 아래로 제한한다.

```json
{
  "situation": "",
  "other_message": "",
  "user_goal": ""
}
```

**향후 확장 가능한 입력값**

```json
{
  "tone_preference": "",
  "avoid": "",
  "relationship_context": ""
}
```

하지만 초기에는 개인정보를 요구하지 않는다.

## 6. AI 출력 구조

AI는 아래 구조로 응답해야 한다.

```json
{
  "relationship_read": {
    "message_function": "",
    "current_dynamic": "",
    "user_risk": ""
  },
  "reply_options": [
    {
      "goal": "maintain_flow",
      "label": "흐름 유지",
      "message": "",
      "intended_effect": ""
    },
    {
      "goal": "regain_leverage",
      "label": "주도권 회복",
      "message": "",
      "intended_effect": ""
    },
    {
      "goal": "set_boundary",
      "label": "선 긋기",
      "message": "",
      "intended_effect": ""
    }
  ],
  "before_send_check": "",
  "internal_evaluation": {
    "humanlike_score": 1,
    "manipulation_risk": "low | medium | high",
    "awkwardness_risk": "low | medium | high",
    "goal_alignment": "low | medium | high",
    "failure_codes": []
  }
}
```

## 7. 사용자 화면에 보여줄 것

사용자 화면에는 아래만 보여준다.

- relationship_read.current_dynamic
- reply_options
- before_send_check

## 8. 사용자 화면에 숨길 것

아래는 화면에 노출하지 않는다.

- internal_evaluation
- failure_codes
- 점수
- 프롬프트 원문
- API 응답 원문
- 개발용 로그

## 9. 응답 검증 단계

AI 응답을 그대로 화면에 보여주지 않는다.

서버 또는 프론트에서 최소한 아래를 검증한다.

1. reply_options가 3개인지
2. 각 reply_options에 message가 있는지
3. message가 너무 길지 않은지
4. 금지 표현이 들어있지 않은지
5. 조종, 질투 유발, 보복성 답장이 없는지
6. internal_evaluation이 화면에 노출되지 않는지
7. JSON 구조가 깨지지 않았는지

## 10. fallback 정책

AI 호출이 실패하면 사용자에게 복잡한 오류를 보여주지 않는다.

**사용자 안내 문구**

지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.

가능하면 현재 app.js의 로컬 후보 풀을 fallback으로 유지한다.

## 11. v1.0 구현 순서

v1.0 구현은 아래 순서로 진행한다.

1. 서버 구조 선택
2. API 키 보관 방식 결정
3. 서버리스 함수 파일 생성
4. 프론트엔드가 서버리스 endpoint를 호출하도록 수정
5. AI 프롬프트 작성
6. AI 응답 검증 로직 작성
7. fallback 처리 작성
8. 테스트 시나리오 6개 검수
9. 실제 문장 품질 검수

## 12. 현재 단계에서 아직 하지 않을 것

아래는 아직 하지 않는다.

- 로그인
- 결제
- DB 저장
- 사용자 기록 저장
- 배포 자동화
- 모바일 앱 전환
- 관리자 페이지
- 복잡한 사용량 제한
- 사용자별 세션 저장

## 13. 핵심 결론

v1.0의 목표는 기능 추가가 아니다.

v1.0의 목표는 하드코딩 답장표에서 벗어나, AI가 상대 메시지의 기능과 사용자의 관계 목표를 읽고 답장 후보를 생성하도록 만드는 것이다.
