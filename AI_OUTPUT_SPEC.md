# AI_OUTPUT_SPEC.md

## 1. 목적

이 문서는 대화코칭어플에서 향후 AI API를 연결할 때 AI가 반드시 따라야 하는 출력 구조를 정의한다.

AI는 사용자의 대화 상황을 분석하되, 상대방을 조종하거나 밀당 기술을 제안하지 않는다.
AI의 목적은 사용자가 덜 후회할 답장을 고를 수 있도록 돕는 것이다.

## 2. 최종 출력 구조

AI 응답은 항상 아래 구조를 따라야 한다.

```json
{
  "strategy_summary": {
    "situation_summary": "",
    "main_risk": "",
    "recommended_direction": ""
  },
  "recommendations": [
    {
      "type": "safe",
      "label": "안전한 답장",
      "message": "",
      "reason": ""
    },
    {
      "type": "warm",
      "label": "조금 더 다정한 답장",
      "message": "",
      "reason": ""
    },
    {
      "type": "boundary",
      "label": "선을 긋는 답장",
      "message": "",
      "reason": ""
    }
  ],
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

## 3. 사용자에게 노출되는 항목

사용자 화면에는 아래 2개만 노출한다.

- strategy_summary
- recommendations

## 4. 사용자에게 노출하지 않는 항목

아래 항목은 내부 검수용이며 사용자에게 직접 보여주지 않는다.

- internal_evaluation
- failure_codes
- burden_level
- naturalness
- actual_use_likelihood
- relationship_risk
- emotional_overreaction_risk
- manipulation_risk
- regret_risk

## 5. strategy_summary 작성 규칙

strategy_summary는 사용자의 상황을 짧고 차분하게 정리한다.

반드시 포함할 것:

1. 현재 상황 요약
2. 대화에서 조심해야 할 점
3. 추천되는 답장 방향

금지할 것:

- 상대방 마음 단정
- 사용자의 불안 증폭
- 과도한 심리 분석
- “상대는 관심이 없다” 같은 단정
- “무조건 끊어라” 같은 극단적 판단
- 장문 상담문

## 6. recommendations 작성 규칙

recommendations는 항상 3개를 제공한다.

1. 안전한 답장
2. 조금 더 다정한 답장
3. 선을 긋는 답장

각 답장은 실제 카카오톡이나 문자로 보낼 수 있을 정도로 자연스럽고 짧아야 한다.

각 답장에는 아래를 포함한다.

- type
- label
- message
- reason

## 7. 답장 문장 기준

좋은 답장:

- 짧다
- 자연스럽다
- 부담이 낮다
- 상대를 압박하지 않는다
- 사용자의 감정을 지나치게 낮추지 않는다
- 관계를 불필요하게 악화시키지 않는다
- 실제로 복사해서 보낼 수 있다

나쁜 답장:

- 일부러 답장을 늦추라고 한다
- 질투를 유발하라고 한다
- 상대를 떠보라고 한다
- 상대가 불안해하게 만들라고 한다
- 사용자의 감정을 폭발시키라고 한다
- 지나치게 차갑다
- 지나치게 매달린다
- 너무 길고 상담문 같다

## 8. internal_evaluation 작성 규칙

internal_evaluation은 내부 품질 검수용이다.
사용자 화면에는 노출하지 않는다.

평가값은 low, medium, high 중 하나를 사용한다.

failure_codes는 문제가 없으면 빈 배열로 둔다.

문제가 있으면 QA_CHECKLIST.md의 F01~F15 코드를 사용한다.

## 9. 결과 실패 기준

아래 중 하나라도 발생하면 결과는 실패로 본다.

- 조종이나 밀당을 권한다.
- 상대를 시험하라고 한다.
- 사용자의 불안을 키운다.
- 상대방 마음을 단정한다.
- 답장이 실제로 보내기 어렵다.
- internal_evaluation이 사용자에게 노출된다.
- recommendations 3개의 차이가 없다.
- strategy_summary와 recommendations 방향이 충돌한다.
