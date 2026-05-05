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
  "적합해요",
  "리스크가",
  "관계 입장",
  "부담감이",
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

const COMPLAINT_ABOUT_USER_INVALID_REPLY_MARKERS = [
  "바쁜",
  "웰컴백",
  "이제 봤",
  "요즘 바빴",
  "정신없었",
  "편하게 생각",
  "아 그랬구나",
  "오키 이해",
  "응응",
  "그래그래",
  "아 미안",
  "미안 ㅋㅋ",
  "오키 좀 줄일",
  "말은 좀 좋게",
  "궁금해서 보냈",
  "왤까요",
  "많았나",
  "줄일게. 근데",
  "많이 보냈나보다",
  "알겠어. 근데 말투",
];

const COMPLAINT_ABOUT_USER_SAFE_FALLBACK = {
  relationship_read: {
    current_dynamic:
      "상대가 연락 빈도로 사용자를 부담스러운 쪽으로 프레임 짜는 순간. 바로 사과로 굴복하면 포지션이 낮아지고, 뻔한 변명·맞장구는 AI처럼 보일 수 있음.",
  },
  reply_options: [
    {
      goal: "maintain_flow",
      label: "프레임 전환",
      message: "들켰네 ㅋㅋ",
      intended_effect: "부담 프레임을 진지하게 인정하지 않고 가볍게 비틈",
    },
    {
      goal: "regain_leverage",
      label: "매력 유지",
      message: "그냥 생각나서 보냈지 ㅋㅋ",
      intended_effect: "매달린 톤 없이 관심은 있다는 인상만 남김",
    },
    {
      goal: "set_boundary",
      label: "여유 있게 물러나기",
      message: "오키 그럼 잠깐 조용히 있어볼게 ㅋㅋ",
      intended_effect: "쫓아가지 않고 내 페이스로 한 발 물러남",
    },
  ],
  before_send_check:
    "과한 사과는 낮은 포지션이 되기 쉽고, 플러팅만 쌓으면 부담 프레임이 더 커질 수 있음. '왤까요?' 류는 기본 후보로 쓰지 말고 아주 장난이 통하는 관계에서만 변형 가능.",
};

function classifyMessageFunction(input) {
  const text = `${input.situation} ${input.other_message} ${input.user_goal}`;

  if (
    text.includes("왜 이렇게 많이") ||
    text.includes("톡을 왜") ||
    text.includes("연락 좀 그만") ||
    text.includes("너무 자주") ||
    text.includes("부담스러워") ||
    text.includes("집착") ||
    text.includes("많이 보내") ||
    text.includes("그만 보내") ||
    text.includes("연락이 많")
  ) {
    return "complaint_about_user";
  }

  if (
    text.includes("바빠") ||
    text.includes("늦었") ||
    text.includes("이제 봤") ||
    text.includes("정신없")
  ) {
    return "excuse_delay";
  }

  return "unknown";
}

function assertComplaintAboutUserReplyAlignment(input, validated) {
  if (classifyMessageFunction(input) !== "complaint_about_user") {
    return;
  }

  for (const option of validated.reply_options) {
    const msg = option.message || "";
    for (const marker of COMPLAINT_ABOUT_USER_INVALID_REPLY_MARKERS) {
      if (msg.includes(marker)) {
        throw new Error("complaint_about_user_invalid_reply");
      }
    }
  }
}

const GOAL_TO_LABEL = {
  maintain_flow: "프레임 전환",
  regain_leverage: "매력 유지",
  set_boundary: "여유 있게 물러나기",
};

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

    const expectedLabel = GOAL_TO_LABEL[option.goal];
    if (!expectedLabel || option.label !== expectedLabel) {
      throw new Error("goal과 label 짝이 맞지 않습니다.");
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
    "너는 대화코칭어플의 답장 생성 엔진이다.",
    "",
    "핵심 목표:",
    "- 단순히 안전하게 넘기는 문장이 아니라, 호감을 올리거나 최소한 매력이 떨어지지 않게 한다.",
    "- 상대가 낮춘 프레임(예: 부담스러운 사람, 매달리는 사람)에 바로 끼어들지 않게 한다.",
    "- 사용자가 비굴하거나 조종적으로 보이지 않게 한다.",
    "- 답장 후보 3개는 아래 세 축을 각각 하나씩 담당해야 한다.",
    "- 성숙한 모범답안·상담문·장문 분석체는 금지. 카카오톡에 붙여넣을 짧은 반응만.",
    "",
    "세 가지 축(구 흐름 유지/주도권/선 긋기 개념은 보조일 뿐, 우선순위는 아래):",
    "",
    "1. 프레임 전환 (goal 키: maintain_flow, label: 반드시 \"프레임 전환\")",
    "   상대가 사용자를 부담스럽게 몰아가는 프레임을 가볍게 비튼다. 진지하게 해명하지 않는다.",
    "",
    "2. 매력 유지 (goal 키: regain_leverage, label: 반드시 \"매력 유지\")",
    "   관심은 있었지만 매달린 건 아니라는 인상을 준다. 과한 플러팅으로 부담 프레임을 키우지 않는다.",
    "",
    "3. 여유 있게 물러나기 (goal 키: set_boundary, label: 반드시 \"여유 있게 물러나기\")",
    "   과하게 사과하지 않고, 쫓아가지 않고, 내 페이스로 한 발 뺀다.",
    "",
    "내부 의미 매핑(설명용, JSON goal 키는 위 유지): reframe≈maintain_flow, keep_attraction≈regain_leverage, relaxed_pullback≈set_boundary.",
    "",
    "윤리적 제한:",
    "- 상대를 일부러 불안하게 만들지 않는다.",
    "- 질투 유발, 보복성 답장, 상대 시험하기, 일부러 답장 늦추기는 금지한다.",
    "- 하지만 무조건 착하게 사과하는 것도 금지다. 낮은 포지션으로 보이면 실패다.",
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
    "금지 톤(답장 본문):",
    "- 과한 사과, 비굴한 수습, 도발만 하는 답, 상대를 조종하려는 답",
    "- 질투 유발, 상대 시험",
    "- 너무 AI스러운 장문",
    "- \"관계\", \"부담\", \"리스크\", \"적합\" 같은 분석어·메타 코멘트",
    "",
    "상대 메시지의 기능을 반드시 먼저 분류해야 한다.",
    "특히 아래 규칙은 절대 어기면 안 된다.",
    "",
    "### complaint_about_user",
    "",
    "상대방 메시지에 아래 표현이 포함되면 반드시 complaint_about_user로 분류한다.",
    "",
    "- 왜 이렇게 많이",
    "- 톡을 왜",
    "- 연락 좀 그만",
    "- 너무 자주",
    "- 부담스러워",
    "- 집착",
    "- 많이 보내",
    "- 그만 보내",
    "- 연락이 많아",
    "",
    "이 경우 상대는 사용자의 연락량이 부담스럽다고 말한 것이다.",
    "",
    "complaint_about_user에서의 목표(중요):",
    "기존 \"상대 부담을 인정하고 안전하게 물러나기\"가 아니다.",
    "상대의 부담 프레임에 바로 굴복하지 않고, 가볍게 비틀거나 여유 있게 물러난다.",
    "무조건 사과·수습·비굴한 물러남은 실패다.",
    "",
    "이 상황에서 특히 피할 답장(맥락 오해·낮은 포지션·도발 과잉):",
    "",
    "- 바쁜일은 끝났어? / 이제 봤어? / 웰컴백 (바쁨 해명으로 오해)",
    "- 아 미안 ㅋㅋ 좀 많았나 / 오키 좀 줄일게 / 줄일게. 근데 말은 좀 좋게 해줘 (과한 사과·비굴한 수습)",
    "- 그냥 궁금해서 보냈지ㅋ / 왤까요? (플러팅·상위포즈 과잉으로 부담 프레임 강화 또는 싸움 유발 가능)",
    "",
    "'왤까요?' 류는 기본 후보로 쓰지 말고, 아주 장난이 통하는 관계에서만 변형 가능하다고 가정한다.",
    "",
    "이 상황에서 우선하는 답장 방향 예시:",
    "",
    "프레임 전환:",
    "- 들켰네 ㅋㅋ",
    "- 아 좀 티났나 ㅋㅋ",
    "- ㅋㅋ 그러게 오늘 좀 말 많았네",
    "",
    "매력 유지:",
    "- 그냥 생각나서 보냈지 ㅋㅋ",
    "- 별건 아니고 그냥 말 걸고 싶었어",
    "- 아 그 정도였나 ㅋㅋ",
    "",
    "여유 있게 물러나기:",
    "- 오키 그럼 잠깐 조용히 있어볼게 ㅋㅋ",
    "- 알겠어 ㅋㅋ 나도 좀 줄일게",
    "- 오케이 접수 ㅋㅋ",
    "",
    "나쁜 예시:",
    "",
    "입력:",
    'other_message = "톡을 왜 이렇게 많이 해!"',
    "",
    "잘못된 출력:",
    '"바쁜일은 끝났어?"',
    '"웰컴백^^"',
    '"아 미안 ㅋㅋ 좀 많았나"',
    '"오키 좀 줄일게"',
    '"그냥 궁금해서 보냈지ㅋ"',
    "",
    "이유:",
    "바쁨 해명으로 읽으면 맥락이 틀어지고, 과한 사과·즉시 수습은 낮은 포지션이 되며, 가벼운 핑계·도발형 반문은 부담 프레임을 키우거나 싸움으로 번질 수 있기 때문이다.",
    "",
    "좋은 출력 예시:",
    '"들켰네 ㅋㅋ"',
    '"그냥 생각나서 보냈지 ㅋㅋ"',
    '"오키 그럼 잠깐 조용히 있어볼게 ㅋㅋ"',
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
              enum: ["프레임 전환", "매력 유지", "여유 있게 물러나기"],
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

    let safeResult;

    try {
      safeResult = validateAiResult(parsed);
      assertComplaintAboutUserReplyAlignment(validation.value, safeResult);
    } catch (innerError) {
      if (innerError && innerError.message === "complaint_about_user_invalid_reply") {
        return sendJson(res, 200, COMPLAINT_ABOUT_USER_SAFE_FALLBACK);
      }

      return sendJson(res, 500, {
        error: "server_error",
        use_fallback: true,
        user_message: "지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }

    return sendJson(res, 200, safeResult);
  } catch (error) {
    return sendJson(res, 500, {
      error: "server_error",
      use_fallback: true,
      user_message: "지금은 답장 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
  }
};
