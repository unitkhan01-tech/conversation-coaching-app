# Vercel 서버리스 계획

## 1. 목적

이 문서는 대화코칭어플을 Vercel 서버리스 함수 구조로 전환하기 위한 계획이다.

현재는 아직 구현 단계가 아니다.

현재 목표는 비개발자 사용자가 혼란스럽지 않도록, 어떤 파일이 왜 필요한지 먼저 정리하는 것이다.

## 2. 현재 구조

현재 프로젝트는 정적 웹앱 구조다.

현재 주요 파일:

- index.html
- style.css
- app.js

현재 앱은 브라우저에서 index.html을 직접 열어 작동한다.

## 3. 목표 구조

AI 연결 후 목표 구조는 아래와 같다.

- index.html
- style.css
- app.js
- api/generate-reply.js
- package.json
- vercel.json
- .env.example

단, 아직 이 파일들을 만들지 않는다.  
이번 문서에서는 계획만 정리한다.

## 4. 파일별 역할

### index.html

사용자가 보는 화면이다.

상황 입력, 상대방 메시지 입력, 관계 목표 선택, 결과 표시 영역을 가진다.

### style.css

앱의 디자인을 담당한다.

### app.js

사용자 입력을 읽고 서버리스 endpoint에 요청을 보낸다.

향후에는 현재 하드코딩 답장 생성 로직을 fallback으로 남길 수 있다.

### api/generate-reply.js

AI API를 호출하는 서버리스 함수다.

**역할**

1. 프론트엔드에서 입력값을 받는다.
2. 입력값을 검증한다.
3. 서버 환경 변수에 저장된 API 키로 AI API를 호출한다.
4. AI 응답을 검증한다.
5. 사용자에게 보여줄 필드만 반환한다.

### package.json

프로젝트 실행과 배포에 필요한 설정 파일이다.

### vercel.json

Vercel 배포 설정 파일이다.

### .env.example

환경변수 예시 파일이다.

**주의:** 실제 API 키를 여기에 넣지 않는다. 예시 이름만 적는다.

## 5. API endpoint 설계

**초기 endpoint**

`POST /api/generate-reply`

**요청 body**

```json
{
  "situation": "",
  "other_message": "",
  "user_goal": ""
}
```

**응답 body**

```json
{
  "relationship_read": {
    "current_dynamic": ""
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
  "before_send_check": ""
}
```

## 6. 화면에 절대 노출하지 않을 것

아래는 사용자 화면에 표시하지 않는다.

- internal_evaluation
- failure_codes
- API 키
- 프롬프트 원문
- AI 응답 원문 전체
- 개발용 로그
- stack trace
- 오류 코드 상세

## 7. fallback 정책

AI 호출이 실패하면 현재 app.js의 로컬 후보 풀을 fallback으로 사용할 수 있다.

**fallback 안내 문구**

지금은 AI 답장 후보를 불러오지 못해서, 임시 답장 후보를 보여드릴게요.

단, 이 문구는 너무 크게 강조하지 않는다.

## 8. 비개발자 보호 원칙

사용자는 코딩을 모른다.

따라서 실제 구현 단계에서는 아래를 지킨다.

- 터미널 명령을 자동 실행하지 않는다.
- Run 버튼이 생기면 먼저 멈춘다.
- API 키를 코드에 직접 넣지 않는다.
- API 키는 환경변수에 넣는다.
- 사용자가 눌러야 할 버튼을 명확히 설명한다.
- 파일 생성과 실행 단계를 분리한다.

## 9. 실제 구현 전 확인할 것

실제 코드 작업 전 아래를 확인한다.

1. Vercel 서버리스 함수 방식으로 갈지 최종 확인
2. OpenAI API 또는 다른 AI API를 사용할지 결정
3. API 키를 어디에서 발급받고 어디에 저장할지 결정
4. 로컬 실행이 필요한지 결정
5. 배포를 지금 할지 나중에 할지 결정

## 10. 현재 결론

현재 단계에서는 Vercel 서버리스 구조를 선택한다.

하지만 아직 실제 API 연결은 하지 않는다.  
먼저 파일 구조와 요청/응답 흐름을 확정한다.
