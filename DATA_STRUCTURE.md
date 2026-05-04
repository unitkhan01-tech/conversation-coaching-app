# DATA_STRUCTURE.md

## 1. 데이터 구조 목표

이 문서는 대화코칭어플 MVP에서 입력값과 출력값이 어떤 구조를 가져야 하는지 정의한다.

초기에는 DB를 사용하지 않는다.
데이터는 화면 안에서만 임시로 사용한다.

## 2. 사용자 입력 구조

사용자 입력값은 아래 구조를 가진다.

```json
{
  "situation": "사용자가 설명한 현재 상황",
  "other_message": "상대방의 최근 메시지",
  "user_intent": "사용자의 답장 의도"
}
```

## 3. 사용자에게 보여주는 출력 구조

사용자에게 보여주는 출력값은 아래 2개다.

```json
{
  "strategy_summary": {
    "situation_summary": "현재 상황 요약",
    "main_risk": "조심해야 할 점",
    "recommended_direction": "추천 답장 방향"
  },
  "recommendations": [
    {
      "type": "safe",
      "label": "안전한 답장",
      "message": "실제 보낼 수 있는 답장 문장",
      "reason": "이 답장이 적절한 이유"
    },
    {
      "type": "warm",
      "label": "조금 더 다정한 답장",
      "message": "실제 보낼 수 있는 답장 문장",
      "reason": "이 답장이 적절한 이유"
    },
    {
      "type": "boundary",
      "label": "선을 긋는 답장",
      "message": "실제 보낼 수 있는 답장 문장",
      "reason": "이 답장이 적절한 이유"
    }
  ]
}
```

## 4. 내부 evaluation 구조

아래 구조는 내부 검수용이다.
사용자 화면에는 노출하지 않는다.

```json
{
  "internal_evaluation": {
    "burden_level": "low | medium | high",
    "naturalness": "low | medium | high",
    "actual_use_likelihood": "low | medium | high",
    "relationship_risk": "low | medium | high",
    "emotional_overreaction_risk": "low | medium | high",
    "manipulation_risk": "low | medium | high",
    "regret_risk": "low | medium | high",
    "failure_codes": []
  }
}
```

## 5. 실패 유형 코드 자리

failure_codes는 배열로 둔다.

예:

```json
{
  "failure_codes": ["F14", "F15"]
}
```

초기 MVP에서는 실제 F01~F15 전체 판정 로직을 만들지 않는다.
다만 나중에 붙일 수 있도록 구조만 열어둔다.

## 6. 화면 노출 원칙

사용자에게는 아래만 보여준다.

- strategy_summary
- recommendations

사용자에게 아래는 보여주지 않는다.

- internal_evaluation
- failure_codes
- 평가 점수
- 개발용 판단 근거 전체
- 프롬프트 원문
