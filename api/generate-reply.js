const MAX_SITUATION_LENGTH = 1200;
const MAX_MESSAGE_LENGTH = 800;
const MAX_GOAL_LENGTH = 300;
const MAX_CANDIDATE_REPLY_LENGTH = 600;
const MAX_REVIEW_FIELD_LENGTH = 420;
const MAX_REVIEW_VARIANT_LENGTH = 100;

const REVIEW_FORBIDDEN_IN_OUTPUT = [
  "조종하라",
  "조종해서",
  "질투를 불러일으",
  "일부러 불안하게",
  "불안하게 만들라",
  "답장을 일부러 늦추",
  "상대를 시험하",
  "깎아내리라",
  "비하하라",
  "OPENAI_API_KEY",
  "sk-proj",
  "internal_evaluation",
  "humanlike_score",
];

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

function parseMode(body) {
  const m = cleanText(body && body.mode);
  return m === "review" ? "review" : "generate";
}

function validateGenerateInput(body) {
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

function validateReviewInput(body) {
  const situation = cleanText(body && body.situation);
  const otherMessage = cleanText(body && body.other_message);
  const candidateReply = cleanText(body && body.candidate_reply);
  const userGoal = cleanText(body && body.user_goal);

  if (!situation || !otherMessage || !candidateReply || !userGoal) {
    return {
      ok: false,
      message: "상황, 상대방 메시지, 검수할 답장, 관계 목표가 모두 필요합니다.",
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

  if (candidateReply.length > MAX_CANDIDATE_REPLY_LENGTH) {
    return {
      ok: false,
      message: "검수할 답장 입력이 너무 깁니다.",
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
      candidate_reply: candidateReply,
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

function getComplaintReframeResult() {
  return {
    relationship_read: {
      current_dynamic:
        "상대가 연락량을 부담스럽게 말한 상황. 여기서 바로 사과하고 내려가면 상대가 만든 프레임에 들어갈 수 있음.",
    },
    reply_options: [
      {
        goal: "reframe",
        label: "프레임 전환",
        message: "들켰네 ㅋㅋ",
        intended_effect: "부담스러운 사람 프레임을 무겁지 않게 비틀어 넘김",
      },
      {
        goal: "keep_attraction",
        label: "매력 유지",
        message: "그냥 생각나서 보냈지 ㅋㅋ",
        intended_effect: "관심은 보이지만 매달리는 느낌은 줄임",
      },
      {
        goal: "relaxed_pullback",
        label: "여유 있게 물러나기",
        message: "오케이 접수 ㅋㅋ 잠깐 조용히 있을게",
        intended_effect: "과하게 사과하지 않고 가볍게 한 발 물러남",
      },
    ],
    before_send_check:
      "장문으로 해명하면 더 쫓아가는 느낌이 날 수 있음. 너무 세게 받아치면 싸움이 됨.",
  };
}

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

const GOAL_TO_LABEL = {
  maintain_flow: "흐름 유지",
  regain_leverage: "주도권 회복",
  set_boundary: "선 긋기",
  reframe: "프레임 전환",
  keep_attraction: "매력 유지",
  relaxed_pullback: "여유 있게 물러나기",
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

function reviewOutputContainsForbidden(text) {
  if (!isString(text)) return true;
  return REVIEW_FORBIDDEN_IN_OUTPUT.some((phrase) => text.includes(phrase));
}

function validateReviewResult(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI 검수 응답 형식이 올바르지 않습니다.");
  }

  const rev = raw.review;
  if (!rev || typeof rev !== "object") {
    throw new Error("review 객체가 없습니다.");
  }

  const keys = ["position", "attraction_effect", "risk", "usable_when", "dangerous_when"];
  const cleaned = {};

  for (const k of keys) {
    const t = cleanText(rev[k]);
    if (!t) {
      throw new Error("검수 필드가 비었습니다.");
    }
    if (t.length > MAX_REVIEW_FIELD_LENGTH) {
      throw new Error("검수 문장이 너무 깁니다.");
    }
    if (reviewOutputContainsForbidden(t)) {
      throw new Error("검수 문장에 허용되지 않은 표현이 포함되었습니다.");
    }
    cleaned[k] = t;
  }

  const bvRaw = rev.better_versions;
  if (!Array.isArray(bvRaw) || bvRaw.length !== 3) {
    throw new Error("better_versions는 정확히 3개여야 합니다.");
  }

  const betterVersions = [];
  for (const item of bvRaw) {
    const s = cleanText(item);
    if (!s || s.length > MAX_REVIEW_VARIANT_LENGTH) {
      throw new Error("변형 문장이 비었거나 너무 깁니다.");
    }
    if (containsAwkwardPhrase(s)) {
      throw new Error("변형 문장에 부적절한 표현이 있습니다.");
    }
    if (reviewOutputContainsForbidden(s)) {
      throw new Error("변형 문장에 허용되지 않은 표현이 포함되었습니다.");
    }
    betterVersions.push(s);
  }

  return {
    review: {
      ...cleaned,
      better_versions: betterVersions,
    },
  };
}

function buildReviewPrompt(input) {
  return [
    "너는 사용자가 보내려는 답장을 관계 전략 관점에서 평가하는 대화 코치다.",
    "",
    "목표:",
    "- 사용자가 낮은 포지션으로 보이지 않게 돕는다.",
    "- 호감이 떨어지는 문장을 피하게 돕는다.",
    "- 무조건 착한 답장으로 바꾸지 않는다.",
    "- 도발, 조종, 비하, 질투 유발, 상대 시험은 권하지 않는다. 답장을 일부러 늦추라고 조언하지 않는다. 상대를 불안하게 만들거나 깎아내리라고 말하지 않는다.",
    "- 답장이 만드는 포지션, 호감 영향, 위험도, 더 나은 변형을 평가한다.",
    "",
    "허용되는 방향:",
    "- 낮은 포지션으로 보이지 않게 하기",
    "- 상대 프레임에 바로 들어가지 않기",
    "- 여유 있는 장난으로 받기",
    "- 호감과 자기 페이스를 동시에 지키기",
    "- 더 자연스러운 변형 제안하기",
    "",
    "평가와 변형 문장은 카카오톡에 붙여넣을 수 있는 자연스러운 짧은 한국어로 쓴다. 코칭 메모나 장문 분석체는 피한다.",
    "better_versions는 서로 다른 짧은 대안 문장 3개를 배열로 넣는다.",
    "",
    "입력(JSON):",
    JSON.stringify(input, null, 2),
    "",
    "반드시 아래 구조의 JSON만 반환한다:",
    '{"review":{"position":"","attraction_effect":"","risk":"","usable_when":"","dangerous_when":"","better_versions":["","",""]}}',
  ].join("\n");
}

function getReviewResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["review"],
    properties: {
      review: {
        type: "object",
        additionalProperties: false,
        required: [
          "position",
          "attraction_effect",
          "risk",
          "usable_when",
          "dangerous_when",
          "better_versions",
        ],
        properties: {
          position: { type: "string" },
          attraction_effect: { type: "string" },
          risk: { type: "string" },
          usable_when: { type: "string" },
          dangerous_when: { type: "string" },
          better_versions: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
  };
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
    "complaint_about_user(연락량 핀잔 등) 입력은 이 API에서 모델 호출 없이 고정 응답으로 처리된다. 아래 규칙은 그 외 입력에 적용된다.",
    "",
    "세 가지 축. reply_options 3개는 서로 다른 goal이어야 하며, goal과 label은 아래 허용 짝만 사용한다.",
    "",
    "A안(기존 goal 키):",
    "- maintain_flow + label \"흐름 유지\"",
    "- regain_leverage + label \"주도권 회복\"",
    "- set_boundary + label \"선 긋기\"",
    "",
    "B안(reframe 계열 goal 키):",
    "- reframe + label \"프레임 전환\" (프레임 가볍게 비틈)",
    "- keep_attraction + label \"매력 유지\" (매달림 없이 관심만)",
    "- relaxed_pullback + label \"여유 있게 물러나기\" (과한 사과 없이 한 발 물러남)",
    "",
    "한 응답 안에서는 A안만 쓰거나 B안만 쓴다. 섞지 않는다.",
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
              enum: [
                "maintain_flow",
                "regain_leverage",
                "set_boundary",
                "reframe",
                "keep_attraction",
                "relaxed_pullback",
              ],
            },
            label: {
              type: "string",
              enum: [
                "흐름 유지",
                "주도권 회복",
                "선 긋기",
                "프레임 전환",
                "매력 유지",
                "여유 있게 물러나기",
              ],
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

  const mode = parseMode(body);

  if (mode === "review") {
    const reviewValidation = validateReviewInput(body);

    if (!reviewValidation.ok) {
      return sendJson(res, 400, {
        error: "invalid_input",
        user_message: reviewValidation.message,
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
                  text: buildReviewPrompt(reviewValidation.value),
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "reply_review_result",
              strict: true,
              schema: getReviewResponseSchema(),
            },
          },
        }),
      });

      const apiResult = await apiResponse.json();

      if (!apiResponse.ok) {
        return sendJson(res, 502, {
          error: "ai_api_error",
          use_fallback: true,
          user_message: "지금은 검수 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      }

      const outputText = extractOutputText(apiResult);

      if (!outputText) {
        return sendJson(res, 502, {
          error: "empty_ai_response",
          use_fallback: true,
          user_message: "지금은 검수 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      }

      let parsed;

      try {
        parsed = JSON.parse(outputText);
      } catch (error) {
        return sendJson(res, 502, {
          error: "invalid_ai_json",
          use_fallback: true,
          user_message: "지금은 검수 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      }

      try {
        const safeReview = validateReviewResult(parsed);
        return sendJson(res, 200, safeReview);
      } catch (innerError) {
        return sendJson(res, 500, {
          error: "server_error",
          use_fallback: true,
          user_message: "지금은 검수 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      }
    } catch (error) {
      return sendJson(res, 500, {
        error: "server_error",
        use_fallback: true,
        user_message: "지금은 검수 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  }

  const validation = validateGenerateInput(body);

  if (!validation.ok) {
    return sendJson(res, 400, {
      error: "invalid_input",
      user_message: validation.message,
    });
  }

  if (classifyMessageFunction(validation.value) === "complaint_about_user") {
    return sendJson(res, 200, getComplaintReframeResult());
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
    } catch (innerError) {
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
