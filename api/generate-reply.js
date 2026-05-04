const MAX_SITUATION_LENGTH = 1200;
const MAX_MESSAGE_LENGTH = 800;
const MAX_GOAL_LENGTH = 300;

const AWKWARD_PHRASES = [
  "편한 때 이어가자",
  "천천히 맞춰가자",
  "여유 생기면 편하게 얘기하자",
  "천천히 해도 돼",
  "수고했어",
  "말해줘서 고마워",
  "바쁘다고 말해줘서 고마워",
  "관계 리스크",
  "적합합니다",
  "추천됩니다",
  "감정 과잉",
  "성숙하게",
  "부드럽게 전달",
  "대화를 이어가고 싶어",
  "내 감정을 차분히 말하고 싶어",
];

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function isString(value) {
  return typeof value === "string";
}

function cleanText(value) {
  if (!isString(value)) return "";
  return value.trim();
}

function validateInput(body) {
  const situation = cleanText(body && body.situation);
  const otherMessage = cleanText(body && body.other_message);
  const userGoal = cleanText(body && body.user_goal);

  if (!situation || !otherMessage || !userGoal) {
    return {
      ok: false,
      message: "상황, 상대방 메시지, 관계 목표가 모두 필요합니다.",
    };
  }

  if (situation.length > MAX_SITUATION_LENGTH) {
    return {
      ok: false,
      message: "현재 상황 입력이 너무 깁니다.",
    };
  }

  if (otherMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: "상대방 메시지 입력이 너무 깁니다.",
    };
  }

  if (userGoal.length > MAX_GOAL_LENGTH) {
    return {
      ok: false,
      message: "관계 목표 입력이 너무 깁니다.",
    };
  }

  return {
    ok: true,
    value: {
      situation,
      other_message: otherMessage,
      user_goal: userGoal,
    },
  };
}

function containsAwkwardPhrase(text) {
  if (!isString(text)) return true;
  return AWKWARD_PHRASES.some((phrase) => text.includes(phrase));
}

function sanitizeReplyOption(option) {
  return {
    goal: cleanText(option && option.goal),
    label: cleanText(option && option.label),
    message: cleanText(option && option.message),
    intended_effect: cleanText(option && option.intended_effect),
  };
}

function validateAiResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("AI 응답이 객체가 아닙니다.");
  }

  if (!result.relationship_read || typeof result.relationship_read !== "object") {
    throw new Error("relationship_read가 없습니다.");
  }

  if (!Array.isArray(result.reply_options) || result.reply_options.length !== 3) {
    throw new Error("reply_options는 정확히 3개여야 합니다.");
  }

  const replyOptions = result.reply_options.map(sanitizeReplyOption);

  for (const option of replyOptions) {
    if (!option.goal || !option.label || !option.message || !option.intended_effect) {
      throw new Error("답장 후보 필드가 부족합니다.");
    }

    if (option.message.length > 80) {
      throw new Error("답장 문장이 너무 깁니다.");
    }

    if (containsAwkwardPhrase(option.message)) {
      throw new Error("금지 표현이 포함된 답장입니다.");
    }
  }

  return {
    relationship_read: {
      current_dynamic: cleanText(result.relationship_read.current_dynamic),
    },
    reply_options: replyOptions,
    before_send_check: cleanText(result.before_send_check),
  };
}

function extractOutputText(apiResult) {
  if (apiResult && typeof apiResult.output_text === "string") {
    return apiResult.output_text;
  }

  if (!apiResult || !Array.isArray(apiResult.output)) {
    return "";
  }

  const parts = [];

  for (const item of apiResult.output) {
    if (!item || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (content && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function buildPrompt(input) {
  return [
    "너는 대화코칭어플의 관계 목표형 답장 생성 엔진이다.",
    "",
    "목표:",
    "- 사용자가 관계에서 너무 매달리거나 휘말리지 않게 돕는다.",
    "- 답장 후보 3개는 서로 다른 관계 목표를 가져야 한다.",
    "- 성숙한 모범답안이나 상담문을 만들지 않는다.",
    "- 실제 카카오톡에 붙여넣을 수 있는 짧은 반응문장을 만든다.",
    "",
    "윤리적 제한:",
    "- 상대를 일부러 불안하게 만들지 않는다.",
    "- 질투 유발, 보복성 답장, 상대 시험하기, 일부러 답장 늦추기는 금지한다.",
    "- 하지만 사용자가 자기 페이스를 회복하고 덜 휘말리도록 돕는 것은 허용한다.",
    "",
    "답장 후보의 목표:",
    "1. maintain_flow / 흐름 유지: 분위기를 크게 키우지 않고 대화를 닫지 않는다.",
    "2. regain_leverage / 주도권 회복: 사용자가 더 쫓아가는 느낌을 줄이고 자기 페이스를 회복한다.",
    "3. set_boundary / 선 긋기: 불편한 지점을 짧게 드러내되 싸움을 걸지 않는다.",
    "",
    "답장 문장 금지:",
    "- 편한 때 이어가자",
    "- 천천히 맞춰가자",
    "- 여유 생기면 편하게 얘기하자",
    "- 천천히 해도 돼",
    "- 수고했어",
    "- 말해줘서 고마워",
    "- 바쁘다고 말해줘서 고마워",
    "- 관계 리스크",
    "- 적합합니다",
    "- 추천됩니다",
    "- 감정 과잉",
    "- 성숙하게",
    "- 부드럽게 전달",
    "",
    "좋은 답장 기준:",
    "- 짧다.",
    "- 실제 카카오톡 반응 같다.",
    "- 너무 착한 척하지 않는다.",
    "- 너무 정직하게 감정을 설명하지 않는다.",
    "- 상대를 조종하지 않는다.",
    "- 목적이 있다.",
    "",
    "사용자 입력:",
    JSON.stringify(input, null, 2),
    "",
    "반드시 JSON만 반환하라.",
  ].join("\n");
}

function getResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["relationship_read", "reply_options", "before_send_check", "internal_evaluation"],
    properties: {
      relationship_read: {
        type: "object",
        additionalProperties: false,
        required: ["message_function", "current_dynamic", "user_risk"],
        properties: {
          message_function: { type: "string" },
          current_dynamic: { type: "string" },
          user_risk: { type: "string" },
        },
      },
      reply_options: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["goal", "label", "message", "intended_effect"],
          properties: {
            goal: {
              type: "string",
              enum: ["maintain_flow", "regain_leverage", "set_boundary"],
            },
            label: {
              type: "string",
              enum: ["흐름 유지", "주도권 회복", "선 긋기"],
            },
            message: { type: "string" },
            intended_effect: { type: "string" },
          },
        },
      },
      before_send_check: { type: "string" },
      internal_evaluation: {
        type: "object",
        additionalProperties: false,
        required: ["humanlike_score", "manipulation_risk", "awkwardness_risk", "goal_alignment", "failure_codes"],
        properties: {
          humanlike_score: { type: "number" },
          manipulation_risk: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          awkwardness_risk: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          goal_alignment: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          failure_codes: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "method_not_allowed",
      user_message: "잘못된 요청입니다.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 503, {
      error: "missing_api_key",
      use_fallback: true,
      user_message: "AI 연결이 아직 설정되지 않았습니다.",
    });
  }

  const model = process.env.OPENAI_MODEL && String(process.env.OPENAI_MODEL).trim();

  if (!model) {
    return sendJson(res, 503, {
      error: "missing_model",
      use_fallback: true,
      user_message: "AI 모델 설정이 아직 완료되지 않았습니다.",
    });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, {
        error: "invalid_json",
        user_message: "요청 형식이 올바르지 않습니다.",
      });
    }
  }

  const validation = validateInput(body);

  if (!validation.ok) {
    return sendJson(res, 400, {
      error: "invalid_input",
      user_message: validation.message,
    });
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: buildPrompt(validation.value),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "relationship_reply_result",
            strict: true,
            schema: getResponseSchema(),
          },
        },
      }),
    });

    const apiResult = await apiResponse.json();

    if (!apiResponse.ok) {
      return sendJson(res, 502, {
        error: "ai_api_error",
        use_fallback: true,
        user_message: "지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }

    const outputText = extractOutputText(apiResult);

    if (!outputText) {
      return sendJson(res, 502, {
        error: "empty_ai_response",
        use_fallback: true,
        user_message: "지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      return sendJson(res, 502, {
        error: "invalid_ai_json",
        use_fallback: true,
        user_message: "지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }

    const safeResult = validateAiResult(parsed);

    return sendJson(res, 200, safeResult);
  } catch (error) {
    return sendJson(res, 500, {
      error: "server_error",
      use_fallback: true,
      user_message: "지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
  }
};
