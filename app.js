(function () {
  "use strict";

  var EXAMPLE_SITUATION = "썸 타는데 상대 답이 예전보다 느려졌어";
  var EXAMPLE_OTHER = "요즘 좀 바빠서 답이 늦었어";

  var lastRenderedMessages = [];
  var lastTriple = null;
  var lastSourceAi = false;
  var lastAiInputPayload = null;
  var lastUserIntentNorm = "unsure";
  var currentMode = "generate";

  var USER_GOAL_FOR_API = {
    light_continue: "대화를 가볍게 이어가고 싶다",
    not_clingy: "내가 너무 매달려 보이고 싶지 않다",
    want_clarity: "상대가 좀 더 명확하게 반응했으면 좋겠다",
    honest_not_fight: "서운함은 보이되 싸우고 싶지는 않다",
    want_boundary: "선을 긋고 싶다",
    unsure: "잘 모르겠다",
  };

  var DISPLAY_LABEL = {
    maintain_flow: "흐름 유지",
    regain_leverage: "주도권 회복",
    set_boundary: "선 긋기",
    reframe: "프레임 전환",
    keep_attraction: "매력 유지",
    relaxed_pullback: "여유 있게 물러나기",
  };

  var COMPLAINT_VOLUME_LABEL = {
    maintain_flow: "프레임 전환",
    regain_leverage: "매력 유지",
    set_boundary: "여유 있게 물러나기",
  };

  var COMPLAINT_VOLUME_HINT = {
    maintain_flow: "부담 프레임을 가볍게 비틈",
    regain_leverage: "매달림 없이 관심만 비침",
    set_boundary: "과한 사과 없이 한 발 물러남",
  };

  var GOAL_FLOW_HINT = {
    maintain_flow: "분위기를 키우지 않고 여지만 남기는 답장",
    regain_leverage: "내가 더 쫓아가는 느낌을 줄이는 답장",
    set_boundary: "불편한 지점을 짧게 드러내는 답장",
    reframe: "부담 프레임을 무겁지 않게 비틀어 넘김",
    keep_attraction: "관심은 보이지만 매달리는 느낌은 줄임",
    relaxed_pullback: "과하게 사과하지 않고 가볍게 한 발 물러남",
  };

  var INTENT_DIRECTION_LINE = {
    light_continue: "크게 안 키우고 대화만 이어갈 때",
    not_clingy: "덜 매달리고 밸런스를 맞출 때",
    want_clarity: "상대 반응이 조금 더 선명해지길 바랄 때",
    honest_not_fight: "서운함은 살리되 싸움은 피할 때",
    want_boundary: "내 기준을 짧게 박을 때",
    unsure: "일단 흐름부터 볼 때",
  };

  var INTENT_GOAL_ORDER = {
    light_continue: ["maintain_flow", "regain_leverage", "set_boundary"],
    not_clingy: ["regain_leverage", "maintain_flow", "set_boundary"],
    want_clarity: ["regain_leverage", "set_boundary", "maintain_flow"],
    honest_not_fight: ["maintain_flow", "set_boundary", "regain_leverage"],
    want_boundary: ["set_boundary", "regain_leverage", "maintain_flow"],
    unsure: ["maintain_flow", "regain_leverage", "set_boundary"],
  };

  var INTENT_WEIGHTS = {
    light_continue: { maintain_flow: 2.8, regain_leverage: 1, set_boundary: 1 },
    not_clingy: { maintain_flow: 1, regain_leverage: 2.8, set_boundary: 1.2 },
    want_clarity: { maintain_flow: 0.9, regain_leverage: 2.4, set_boundary: 2.4 },
    honest_not_fight: { maintain_flow: 1.2, regain_leverage: 1, set_boundary: 1.9 },
    want_boundary: { maintain_flow: 0.8, regain_leverage: 1, set_boundary: 2.9 },
    unsure: { maintain_flow: 2.2, regain_leverage: 1, set_boundary: 1 },
  };

  function normalizeUserIntent(v) {
    var legacy = {
      continue: "light_continue",
      warm: "not_clingy",
      honest: "honest_not_fight",
      boundary: "want_boundary",
      unsure: "unsure",
    };
    if (legacy[v]) return legacy[v];
    if (INTENT_DIRECTION_LINE[v]) return v;
    return "unsure";
  }

  function intentForInfer(ui) {
    if (ui === "want_boundary") return "boundary";
    if (ui === "honest_not_fight") return "honest";
    if (ui === "not_clingy") return "warm";
    if (ui === "light_continue" || ui === "want_clarity") return "continue";
    return "unsure";
  }

  var SCENARIO_PRESETS = {
    complaint_contact: {
      situation: "내가 상대에게 톡을 몇 번 보냈는데 상대가 부담스러워하는 것 같아요.",
      otherMessage: "톡을 왜 이렇게 많이 해!",
      intent: "light_continue",
    },
    crush_continue: {
      situation: "썸을 타는 중인데 상대 답장이 예전보다 조금 느려졌어요.",
      otherMessage: "요즘 좀 바빠서 답장이 늦었어.",
      intent: "light_continue",
    },
    crush_warm: {
      situation:
        "요즘 서로 연락은 하는데 분위기가 조금 애매해요. 너무 가볍게만 보이고 싶지는 않아요.",
      otherMessage: "오늘은 좀 정신없었어. 이제야 봤네.",
      intent: "not_clingy",
    },
    tension_unsure: {
      situation: "예전에는 대화가 잘 이어졌는데 요즘은 답장이 짧고 대화가 금방 끊겨요.",
      otherMessage: "응 알겠어.",
      intent: "unsure",
    },
    conflict_honest: {
      situation: "약속을 잡아놓고 상대가 계속 미루는 것 같아서 서운해요.",
      otherMessage: "이번 주도 좀 어려울 것 같아. 미안.",
      intent: "honest_not_fight",
    },
    boundary_clear: {
      situation: "상대가 필요할 때만 연락하는 것 같아서 지쳤어요.",
      otherMessage: "혹시 지금 통화 가능해?",
      intent: "want_boundary",
    },
    relation_ambiguous: {
      situation: "상대가 호감이 있는 것처럼 행동하다가도 갑자기 거리를 두는 것 같아요.",
      otherMessage: "그냥 편하게 생각해.",
      intent: "unsure",
    },
  };

  var PRESET_TO_ENGINE = {
    complaint_contact: "complaint_volume",
    crush_continue: "late_reply_casual",
    crush_warm: "late_reply_warm",
    tension_unsure: "low_tension",
    conflict_honest: "conflict_disappointed",
    boundary_clear: "boundary_call",
    relation_ambiguous: "ambiguous_relation",
  };

  var awkwardPhrases = [
    "편한 때 이어가자",
    "천천히 맞춰가자",
    "천천히 해",
    "여유 생기면 편하게 얘기하자",
    "천천히 해도 돼",
    "말해줘서 고마워",
    "바쁘다고 말해줘서 고마워",
    "수고했어",
    "대화를 이어가고 싶어",
    "서로 편하게 생각하자",
    "내 감정을 차분히 말하고 싶어",
    "나는 지금 무리해서 맞추긴 힘들어",
    "상대를 자극하지 않는 답장이에요",
    "이 답장이 적합해요",
    "부담을 줄이는 방향이에요",
    "관계 리스크를 낮춰요",
    "네 얘기 들으니까 반갑다",
    "내 마음도 살짝 드러내고 싶어",
    "나도 신경 쓰고 있었어",
    "나는 조금 헷갈리긴 했는데",
    "계속 맞춰주긴 어려워",
    "가능할 때 다시 얘기하자",
    "부담 없이 이어가고 싶어",
    "우리 천천히 맞춰가자",
    "네가 편할 때 말해줘",
    "답장을 강요하고 싶진 않아",
    "관계를 망치고 싶지 않아",
    "오키 이해했어",
    "그럴 수 있지 뭐",
    "요즘 바빴나보네",
    "알겠어. 나도 너무 무겁게 보진 않을게",
    "부드럽게 전달",
    "적합합니다",
    "추천됩니다",
  ];

  var humanlikeBanned = [
    "편한 때",
    "이어가자",
    "맞춰가자",
    "여유 생기면",
    "천천히 해도 돼",
    "수고했어",
    "대화를 이어",
    "마음을 표현",
    "감정을 전달",
    "관계를",
    "리스크",
    "적합",
    "추천",
    "부드럽게",
    "성숙하게",
    "추천됩",
    "적합합",
  ];

  var awkwardCoachingPhrases = [
    "상대가 방어적으로 느낄 수 있습니다",
    "관계 리스크",
    "감정 과잉",
    "부담을 줄이는 방향",
    "이 답장이 적합",
    "추천되는 방향",
    "실제 사용 의향",
    "조종 위험",
    "평가 점수",
    "적합합니다",
    "추천됩니다",
  ];

  var MESSAGE_POOLS = {
    complaint_volume: {
      maintain_flow: ["들켰네 ㅋㅋ", "아 좀 티났나 ㅋㅋ", "ㅋㅋ 오늘 좀 말 많았네"],
      regain_leverage: [
        "그냥 생각나서 보냈지 ㅋㅋ",
        "별건 아니고 그냥 말 걸고 싶었어",
        "아 그 정도였나 ㅋㅋ",
      ],
      set_boundary: [
        "오케이 접수 ㅋㅋ 잠깐 조용히 있을게",
        "알겠어 ㅋㅋ 나도 좀 줄일게",
        "오케이 잠깐 조용히 모드 갈게 ㅋㅋ",
      ],
    },
    late_reply_combined: {
      maintain_flow: [
        "그럼 일봐 바쁜데",
        "그럴수있지 ㅋㅋ",
        "시간 날 때 연락해",
        "답할 시간마저 없었구나",
        "ㅇ ㅇ",
        "그렇게 바쁘면 이번 주 못보겠네?",
        "아 그래? 내일 보랬더니. 그럼 일봐",
        "아하 ㅋㅋ 알겠어",
        "바쁜 거 이해 ㅇㅋ",
      ],
      regain_leverage: [
        "좀 오래 걸리긴 하더라",
        "앞으로도 그럼 계속 늦겠네?",
        "아냐 나도 바빳어",
        "지금은 톡 답 길게 못해",
        "나중에 내가 톡할께",
        "괜찮아. 그럴수있지",
        "오키 그럼",
        "아하 그런 거였구나",
        "나도 좀 정신없었음",
      ],
      set_boundary: [
        "너무 뜸하면 나도 좀 헷갈리긴 해",
        "오키. 근데 너무 뜸하면 좀 신경 쓰여",
        "괜찮아. 근데 너무 오래 비면 좀 애매하긴 해",
        "알겠어. 다만 너무 뜸하면 나도 식긴 해",
        "이해는 하는데 너무 뜸하면 나도 좀 그래",
        "오키. 그래도 너무 늦으면 말해줘",
        "알겠어. 근데 계속 이러면 좀 애매하긴 해",
        "응. 너무 끊기면 나도 좀 헷갈려",
        "늦는 건 알겠는데 너무 뜸하면 그래",
      ],
    },
    low_tension: {
      maintain_flow: [
        "응응",
        "오키",
        "알겠어",
        "그래그래",
        "오키 ㅋㅋ",
        "응 알겠어",
        "그래",
        "알겠당",
        "ㅇㅇ",
      ],
      regain_leverage: [
        "오늘은 좀 조용하네",
        "요즘 좀 바빠?",
        "오늘 텐션 낮네",
        "오키 오늘은 여기까지인가",
        "오늘은 말이 짧네",
        "그래 오늘은 조용하네",
        "오키 그럼",
        "응 오늘은 짧게 가네",
        "오늘 좀 한산하네",
      ],
      set_boundary: [
        "요즘 대화가 좀 짧긴 하다",
        "응. 근데 요즘 좀 짧아진 느낌은 있어",
        "음 요즘 좀 조용하긴 하네",
        "오키. 근데 요즘 좀 단답이긴 해",
        "그래. 근데 요즘 대화가 좀 끊기네",
        "알겠어. 나도 너무 이어가진 않을게",
        "응. 나도 오늘은 여기까지 할게",
        "오키. 나도 더 붙잡진 않을게",
        "짧게 오는 건 알겠는데 좀 그래",
      ],
    },
    conflict_disappointed: {
      maintain_flow: [
        "아 이번 주도 어렵구나",
        "이번 주도 안 되는구나",
        "음 알겠어",
        "아쉽긴 한데 알겠어",
        "오키. 그럼 다음에 보자",
        "알겠어 이번 주는 어렵구나",
        "아 그렇구나",
        "오키 일단 알겠어",
        "그럴 수 있지 ㅇㅇ",
      ],
      regain_leverage: [
        "오키. 나도 일정 다시 볼게",
        "알겠어. 나도 다른 일정 볼게",
        "그럼 나도 이번 주는 비워두진 않을게",
        "오키. 나도 내 일정대로 할게",
        "알겠어. 그럼 나도 따로 움직일게",
        "오키 그럼 다음에 맞으면 보자",
        "알겠어. 나도 너무 기다리진 않을게",
        "그럼 나도 이번 주는 신경 안 쓸게",
        "나도 그냥 내 일 봐야겠다",
      ],
      set_boundary: [
        "알겠어. 좀 아쉽긴 하다",
        "계속 미뤄지면 나도 좀 난감해",
        "음 계속 미뤄지니까 좀 그렇긴 하네",
        "이해는 하는데 아쉬운 건 어쩔 수 없네",
        "오키. 근데 다음엔 좀 미리 말해줘",
        "알겠어. 근데 계속 미뤄지면 나도 힘들어",
        "음 이번엔 알겠어. 다음엔 미리 얘기해줘",
        "아쉽긴 해. 그래도 알겠어",
        "미루는 건 알겠는데 계속이면 좀 그래",
      ],
    },
    boundary_call: {
      maintain_flow: [
        "지금은 어려워",
        "지금은 좀 힘들어",
        "오늘은 통화 어렵겠다",
        "지금은 바로 받긴 힘들어",
        "오늘은 좀 안 될 것 같아",
        "지금은 못 받을 것 같아",
        "지금은 좀 그래",
        "오늘은 패스할게",
        "지금은 좀 빡세",
      ],
      regain_leverage: [
        "나중에 가능하면 말할게",
        "지금은 안 되고 내가 가능할 때 말할게",
        "오늘은 어렵고 나중에 볼게",
        "지금은 좀 안 돼",
        "나중에 얘기하자",
        "지금은 내 쪽이 좀 어려워",
        "내가 가능할 때 말할게",
        "지금은 못 맞출 것 같아",
        "시간 맞으면 내가 먼저 볼게",
      ],
      set_boundary: [
        "갑자기 통화는 좀 어려워",
        "갑자기 맞추긴 좀 힘들어",
        "지금 바로는 좀 어렵다",
        "갑자기는 좀 그래",
        "지금 당장은 어렵겠어",
        "바로 통화는 힘들어",
        "이렇게 갑자기는 좀 어려워",
        "오늘은 통화까지는 힘들어",
        "갑통은 오늘은 무리",
      ],
    },
    ambiguous_relation: {
      maintain_flow: [
        "응 알겠어",
        "그래 편하게 생각할게",
        "오키 알겠어",
        "음 알겠어",
        "응 무슨 말인지는 알겠어",
        "그래 그렇게 생각해볼게",
        "알겠어 ㅋㅋ",
        "오키",
        "ㅇㅋ 알겠어",
      ],
      regain_leverage: [
        "나도 너무 무겁게 보진 않을게",
        "오키 나도 편하게 볼게",
        "알겠어. 나도 너무 깊게는 안 볼게",
        "응 나도 그렇게 생각해볼게",
        "그래 나도 너무 의미 두진 않을게",
        "오키 그럼 나도 편하게 볼게",
        "알겠어. 나도 좀 가볍게 볼게",
        "응 나도 내 식대로 볼게",
        "나도 깊게 파고들진 않을게",
      ],
      set_boundary: [
        "근데 가끔 좀 헷갈리긴 해",
        "너무 애매하면 나도 좀 헷갈려",
        "편하게 보려고는 하는데 헷갈릴 때는 있어",
        "응. 근데 가끔은 좀 애매하긴 해",
        "오키. 근데 너무 애매하면 나도 좀 그래",
        "나도 편하게 보려는데 가끔 헷갈려",
        "무슨 말인지는 알겠는데 좀 애매하긴 해",
        "응 알겠어. 근데 헷갈리는 건 있어",
        "편하게는 하는데 가끔은 묘함",
      ],
    },
  };

  function poolKeyForEngine(engineId) {
    if (engineId === "late_reply_casual" || engineId === "late_reply_warm") return "late_reply_combined";
    return engineId;
  }

  var FALLBACKS = {
    complaint_volume: {
      maintain_flow: "들켰네 ㅋㅋ",
      regain_leverage: "그냥 생각나서 보냈지 ㅋㅋ",
      set_boundary: "오케이 접수 ㅋㅋ 잠깐 조용히 있을게",
    },
    late_reply_combined: {
      maintain_flow: "아하 ㅋㅋ",
      regain_leverage: "오키 그럼",
      set_boundary: "너무 뜸하면 좀 그래",
    },
    low_tension: {
      maintain_flow: "응응",
      regain_leverage: "오늘은 좀 조용하네",
      set_boundary: "요즘 답이 짧네",
    },
    conflict_disappointed: {
      maintain_flow: "아 그렇구나",
      regain_leverage: "나도 일정 볼게",
      set_boundary: "아쉽긴 하다",
    },
    boundary_call: {
      maintain_flow: "지금은 어려워",
      regain_leverage: "나중에 말할게",
      set_boundary: "갑통은 좀 그래",
    },
    ambiguous_relation: {
      maintain_flow: "응 알겠어",
      regain_leverage: "나도 가볍게 볼게",
      set_boundary: "가끔 헷갈림",
    },
  };

  var PREFLIGHT_BY_ENGINE = {
    complaint_volume:
      "상대가 핀잔을 준 상황이라, 바로 받아치면 싸움이 커질 수 있음. 하지만 너무 비굴하게 사과할 필요도 없음.",
    late_reply_casual:
      "너무 괜찮은 척하면 내 감정이 묻히고, 바로 따지면 분위기가 닫힐 수 있음.",
    late_reply_warm:
      "너무 괜찮은 척하면 내 감정이 묻히고, 바로 따지면 분위기가 닫힐 수 있음.",
    low_tension: "답장 하나로 관계를 확인받으려 하면 말이 무거워질 수 있음.",
    conflict_disappointed: "서운함을 숨길 필요는 없지만, 첫 답장부터 세게 던지면 싸움이 될 수 있음.",
    boundary_call: "거절을 길게 설명하면 다시 맞춰주는 흐름으로 갈 수 있음.",
    ambiguous_relation:
      "바로 관계 정의를 요구하면 부담이 커질 수 있음. 내 헷갈림만 짧게 드러내도 충분함.",
  };

  var SCENARIO_ENGINE = {
    late_reply_casual: {
      situation_brief:
        "상대가 바빴다고 말한 상황. 바로 따지기엔 조금 이르고, 너무 괜찮은 척할 필요도 없음.",
      eval: { burden_level: "low", relationship_risk: "low" },
    },
    late_reply_warm: {
      situation_brief: "상대가 답은 했지만 늦었다. 호감을 조금 보여줘도 되지만, 기다린 티를 너무 많이 낼 필요는 없음.",
      eval: { burden_level: "low", actual_use_likelihood: "high" },
    },
    low_tension: {
      situation_brief: "상대 답장이 짧아져서 신경 쓰일 수 있지만, 지금 바로 의미를 확정하긴 어려움.",
      eval: { burden_level: "low", relationship_risk: "medium", emotional_overreaction_risk: "low" },
    },
    conflict_disappointed: {
      situation_brief: "서운한 게 자연스러운 상황. 다만 첫 답장부터 세게 던지면 싸움으로 갈 수 있음.",
      eval: { relationship_risk: "medium", regret_risk: "medium", emotional_overreaction_risk: "medium" },
    },
    boundary_call: {
      situation_brief: "상대 요청에 바로 맞춰줄 필요는 없음. 길게 설명할수록 오히려 끌려갈 수 있음.",
      eval: { burden_level: "medium", relationship_risk: "medium", actual_use_likelihood: "medium" },
    },
    ambiguous_relation: {
      situation_brief: "상대가 편하게 생각하자고 했지만, 그 말이 거리두기인지 편안함인지 애매한 상태.",
      eval: { burden_level: "low", relationship_risk: "medium", emotional_overreaction_risk: "low" },
    },
    complaint_volume: {
      situation_brief:
        "상대가 연락 양이 부담스럽다고 느낀 상황. 여기서 모른 척하거나 장난처럼 넘기면 더 날카로워질 수 있음.",
      eval: { burden_level: "medium", relationship_risk: "medium", actual_use_likelihood: "medium" },
    },
  };

  function classifyMessageIntent(text) {
    var t = (text || "").replace(/^\s+|\s+$/g, "");
    if (!t) return "ambiguous";

    if (
      /톡.*많이|많이.*해|연락.*그만|자주.*보내|부담스러|집착|왜.*이렇게.*많|너무\s*자주|연락\s*좀|그만해|그만\s*해|보내지\s*마/i.test(
        t
      )
    )
      return "complaint_about_user";

    if (/통화\s*가능|잠깐\s*전화|전화해|지금\s*통화|나와|볼\s*수\s*있어|지금\s*가능/i.test(t))
      return "request_or_demand";

    if (
      /이번\s*주.*어려|못\s*만날|약속.*미뤄|취소|미안.*못\s*만|어려울\s*것\s*같아.*미안|오늘은\s*안\s*될\s*것\s*같아/i.test(
        t
      )
    )
      return "apology_or_cancel";

    if (/편하게\s*생각|부담\s*갖지\s*말|연애\s*생각\s*없|진지하게\s*생각하지/i.test(t))
      return "rejection_or_distance";

    if (t.length <= 14 && /^응\s*알겠어/i.test(t)) return "short_low_energy";
    if (t.length <= 18 && /^(응|네|ㅇㅇ|알겠어|그래|몰라|오케이|ok|응응)(\s|\.|!|…|~|$)/i.test(t))
      return "short_low_energy";
    if (t.length <= 5 && /^(응|네|ㅇㅇ|그래|몰라)$/i.test(t)) return "short_low_energy";

    if (/바빠|바쁘|늦었|늦게|답.*늦|이제\s*봤|이제야|정신없|미안.*이제\s*봤/i.test(t)) return "excuse_delay";

    return "ambiguous";
  }

  function mapIntentClassToEngine(cls, other) {
    switch (cls) {
      case "complaint_about_user":
        return "complaint_volume";
      case "request_or_demand":
        return "boundary_call";
      case "apology_or_cancel":
        return "conflict_disappointed";
      case "rejection_or_distance":
        return "ambiguous_relation";
      case "short_low_energy":
        return "low_tension";
      case "excuse_delay":
        return /정신없|이제\s*봤|이제야|답\s*와|답왔/i.test(other || "") ? "late_reply_warm" : "late_reply_casual";
      default:
        return null;
    }
  }

  function mentionsBusy(msg) {
    return /바빠|바쁘|늦었|늦게|답장 늦|답이 늦|이제야|못 봤|정신없/i.test(msg);
  }

  function mentionsShortDry(msg) {
    var t = (msg || "").trim();
    return t.length <= 14 && /^(응|네|ㅇㅇ|알겠|그래|오케이|ok)/i.test(t);
  }

  function containsAnyPhrase(text, phrases) {
    var s = text || "";
    for (var i = 0; i < phrases.length; i++) {
      if (phrases[i] && s.indexOf(phrases[i]) !== -1) return true;
    }
    return false;
  }

  function countPeriods(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) === ".") n++;
    }
    return n;
  }

  function isBannedReplyWord(s) {
    if (/나는|내 감정|리스크/.test(s)) return true;
    if (/관계를|관계가|관계는|관계 정/.test(s)) return true;
    if (/부담 없|부담을|부담이|부담 줄|부담 갖/i.test(s)) return true;
    return false;
  }

  function filterHumanlikeReplies(line) {
    var raw = (line || "").replace(/^\s+|\s+$/g, "");
    if (!raw) return "";
    if (raw.length > 40) return "";
    if (countPeriods(raw) > 2) return "";
    if (/합니다|습니다|입니다|적합|리스크|부담을/.test(raw)) return "";
    if (containsAnyPhrase(raw, awkwardPhrases)) return "";
    if (containsAnyPhrase(raw, humanlikeBanned)) return "";
    if (isBannedReplyWord(raw)) return "";
    return raw;
  }

  function filterCoachingLine(line) {
    var raw = (line || "").replace(/^\s+|\s+$/g, "");
    if (!raw) return "";
    if (containsAnyPhrase(raw, awkwardCoachingPhrases)) return "";
    if (/합니다|습니다|입니다|적합합니다|리스크를 낮|추천됩|감정 과잉/.test(raw)) return "";
    return raw;
  }

  function fieldsMatchPreset(situation, otherMessage, userIntent, scenarioId) {
    var preset = SCENARIO_PRESETS[scenarioId];
    if (!preset) return false;
    var u = normalizeUserIntent(userIntent);
    var pi = normalizeUserIntent(preset.intent);
    return situation === preset.situation && otherMessage === preset.otherMessage && u === pi;
  }

  function inferEngineScenario(situation, otherMessage, userIntent) {
    var sit = (situation || "").trim();
    var other = (otherMessage || "").trim();
    var blob = sit + "\n" + other;
    var ui = normalizeUserIntent(userIntent);
    var intent = intentForInfer(ui);

    if (intent === "boundary" || /통화\s*가능|전화\s*가능|지금\s*통화|통화\s*돼|통화해|지금\s*가능/i.test(other))
      return "boundary_call";
    if (
      intent === "honest" ||
      (/미안|어려울 것 같아|어려울것|이번 주도|약속|미뤄|미루|서운/i.test(blob) && /미안|어려울|안 될|어렵다/i.test(other))
    )
      return "conflict_disappointed";
    if (/편하게\s*생각|그냥\s*편하게|편하게\s*해/i.test(other) && /애매|헷갈|호감|썸|거리/i.test(sit))
      return "ambiguous_relation";
    if (/정신없었|이제\s*봤네|이제야|답\s*와서|답왔/i.test(other) || intent === "warm") return "late_reply_warm";
    if (mentionsShortDry(other) || /단답|짧아|조용|응\s*알겠어|텐션|잘 모르/i.test(sit + other))
      return "low_tension";
    if (mentionsBusy(other) || /늦었|늦게|바빠|바쁘|답장 늦/i.test(other) || intent === "continue")
      return "late_reply_casual";
    if (intent === "unsure") return "low_tension";
    return "late_reply_casual";
  }

  function resolveEngineId(situation, otherMessage, userIntent, scenarioId) {
    var sid = scenarioId || "manual";
    var sit = (situation || "").trim();
    var other = (otherMessage || "").trim();
    var ui = normalizeUserIntent(userIntent);
    var intentClass = classifyMessageIntent(other);
    var engineId = mapIntentClassToEngine(intentClass, other);
    if (!engineId) {
      if (sid !== "manual" && fieldsMatchPreset(sit, other, userIntent, sid) && PRESET_TO_ENGINE[sid]) {
        engineId = PRESET_TO_ENGINE[sid];
      } else {
        engineId = inferEngineScenario(situation, otherMessage, userIntent);
      }
    }
    return engineId;
  }

  function defaultEval(overrides) {
    var base = {
      burden_level: "low",
      naturalness: "medium",
      actual_use_likelihood: "medium",
      relationship_risk: "low",
      emotional_overreaction_risk: "low",
      manipulation_risk: "low",
      regret_risk: "low",
      failure_codes: [],
    };
    if (!overrides) return base;
    for (var k in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, k)) base[k] = overrides[k];
    }
    return base;
  }

  function finalize(coaching_result, evaluation) {
    return {
      coaching_result: coaching_result,
      strategy_summary: {
        situation_summary: coaching_result.situation_brief,
        main_risk: coaching_result.main_caution,
        recommended_direction: coaching_result.recommended_tone,
      },
      recommendations: coaching_result.recommendations,
      internal_evaluation: evaluation,
    };
  }

  function expandCandidatesForWeight(candidates, weight) {
    var w = Math.max(1, Math.round(Number(weight) * 2));
    var out = [];
    for (var i = 0; i < candidates.length; i++) {
      for (var j = 0; j < w; j++) out.push(candidates[i]);
    }
    return out.length ? out : candidates.slice();
  }

  function pickRandomReply(candidates, recentMessages, fallback) {
    var recent = recentMessages || [];
    var ok = [];
    for (var i = 0; i < candidates.length; i++) {
      var f = filterHumanlikeReplies(candidates[i]);
      if (!f) continue;
      if (recent.indexOf(f) !== -1) continue;
      ok.push(f);
    }
    if (ok.length === 0) {
      var fb = filterHumanlikeReplies(fallback);
      if (fb && recent.indexOf(fb) === -1) return fb;
      fb = filterHumanlikeReplies(fallback);
      if (fb) return fb;
      return "응";
    }
    return ok[Math.floor(Math.random() * ok.length)];
  }

  function triplesEqual(a, b) {
    if (!a || !b || a.length !== 3 || b.length !== 3) return false;
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  function getGoalPools(engineId) {
    var pk = poolKeyForEngine(engineId);
    return MESSAGE_POOLS[pk] || MESSAGE_POOLS.late_reply_combined;
  }

  function getFallbacks(engineId) {
    var pk = poolKeyForEngine(engineId);
    return FALLBACKS[pk] || FALLBACKS.late_reply_combined;
  }

  function drawRecommendationTriple(engineId, other, drawOpts) {
    var prev = drawOpts && drawOpts.previousTriple;
    var baseRecent = (drawOpts && drawOpts.lastRenderedMessages) ? drawOpts.lastRenderedMessages.slice() : [];
    var userIntentNorm = normalizeUserIntent((drawOpts && drawOpts.userIntent) || "unsure");
    var goalOrder = INTENT_GOAL_ORDER[userIntentNorm] || INTENT_GOAL_ORDER.unsure;
    var weights = INTENT_WEIGHTS[userIntentNorm] || INTENT_WEIGHTS.unsure;
    var pools = getGoalPools(engineId);
    var fbs = getFallbacks(engineId);

    var outerMax = 2;
    for (var outer = 0; outer < outerMax; outer++) {
      var recentBase = outer === 0 ? baseRecent : [];
      for (var attempt = 0; attempt < 55; attempt++) {
        var picked = [];
        var pickedGoals = [];
        var recent = recentBase.slice();
        for (var ki = 0; ki < 3; ki++) {
          var goal = goalOrder[ki];
          var rawList = pools[goal] || [];
          var expanded = expandCandidatesForWeight(rawList, weights[goal] || 1);
          var fb = fbs[goal] || "응";
          var msg = pickRandomReply(expanded, recent.concat(picked), fb);
          picked.push(msg);
          pickedGoals.push(goal);
        }
        if (picked[0] === picked[1] || picked[0] === picked[2] || picked[1] === picked[2]) continue;
        if (prev && triplesEqual(picked, prev)) continue;
        return { messages: picked, goals: pickedGoals };
      }
    }
    var poolsF = getGoalPools(engineId);
    var fbsF = getFallbacks(engineId);
    return {
      messages: [
        pickRandomReply(poolsF.maintain_flow || [], [], fbsF.maintain_flow),
        pickRandomReply(poolsF.regain_leverage || [], [], fbsF.regain_leverage),
        pickRandomReply(poolsF.set_boundary || [], [], fbsF.set_boundary),
      ],
      goals: ["maintain_flow", "regain_leverage", "set_boundary"],
    };
  }

  function recommendationsFromDraw(draw, engineId) {
    var pk = poolKeyForEngine(engineId || "");
    var complaintVol = pk === "complaint_volume";
    var out = [];
    for (var i = 0; i < 3; i++) {
      var g = draw.goals[i];
      var lab = complaintVol ? COMPLAINT_VOLUME_LABEL[g] : DISPLAY_LABEL[g];
      var hintLine = complaintVol ? COMPLAINT_VOLUME_HINT[g] : GOAL_FLOW_HINT[g];
      out.push({
        type: g,
        label: lab,
        message: draw.messages[i],
        hint: hintLine || "",
      });
    }
    return out;
  }

  function pushRecentMessages(msgs) {
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (!m) continue;
      if (lastRenderedMessages.indexOf(m) === -1) lastRenderedMessages.push(m);
    }
    while (lastRenderedMessages.length > 48) lastRenderedMessages.shift();
  }

  function buildEngineResult(engineId, other, drawOpts) {
    var pack = SCENARIO_ENGINE[engineId] || SCENARIO_ENGINE.late_reply_casual;
    var userIntentNorm = normalizeUserIntent((drawOpts && drawOpts.userIntent) || "unsure");
    var mergedDrawOpts = {};
    for (var k in drawOpts || {}) mergedDrawOpts[k] = drawOpts[k];
    mergedDrawOpts.userIntent = userIntentNorm;

    var draw = drawRecommendationTriple(engineId, other, mergedDrawOpts);
    var recs = recommendationsFromDraw(draw, engineId);

    var situation_brief = filterCoachingLine(pack.situation_brief) || pack.situation_brief;
    var direction = INTENT_DIRECTION_LINE[userIntentNorm] || INTENT_DIRECTION_LINE.unsure;
    var preflight = PREFLIGHT_BY_ENGINE[engineId] || "";

    var cr = {
      situation_brief: situation_brief,
      main_caution: "",
      recommended_tone: direction,
      recommendations: recs,
      avoid_reply: { title: "", description: "" },
      preflight_check: filterCoachingLine(preflight) || preflight,
    };
    return finalize(cr, defaultEval(pack.eval));
  }

  function generateCoachingResult(situation, otherMessage, userIntent, scenarioId, drawOpts) {
    var other = (otherMessage || "").trim();
    var engineId = resolveEngineId(situation, otherMessage, userIntent, scenarioId);
    var d = drawOpts || {};
    d.userIntent = normalizeUserIntent(userIntent);
    return buildEngineResult(engineId, other, d);
  }

  function generateLocalFallbackResult(situation, otherMessage, userIntent, scenarioId, drawOpts) {
    return generateCoachingResult(situation, otherMessage, userIntent, scenarioId, drawOpts || {});
  }

  function goalTextForApi(userIntentRaw) {
    var u = normalizeUserIntent(userIntentRaw);
    return USER_GOAL_FOR_API[u] || USER_GOAL_FOR_API.unsure;
  }

  function cleanAiString(s) {
    if (typeof s !== "string") return "";
    return s.replace(/^\s+|\s+$/g, "");
  }

  function normalizeResult(kind, payload, userIntentNorm) {
    if (kind === "local") {
      var cr = payload;
      if (!cr) return null;
      return {
        flowSummary: cr.situation_brief || "",
        directionLine: cr.recommended_tone || "",
        recommendations: cr.recommendations || [],
        beforeSend: cr.preflight_check || "",
      };
    }
    if (kind !== "ai") return null;
    var p = payload;
    var rd = p.relationship_read;
    if (!rd || typeof rd !== "object") return null;
    var opts = p.reply_options;
    if (!Array.isArray(opts) || opts.length !== 3) return null;
    var recs = [];
    for (var i = 0; i < 3; i++) {
      var o = opts[i];
      var goal = cleanAiString(o && o.goal);
      if (!goal || !DISPLAY_LABEL[goal]) return null;
      var msg = cleanAiString(o && o.message);
      if (!msg) return null;
      var lab = cleanAiString(o && o.label) || DISPLAY_LABEL[goal];
      var eff = cleanAiString(o && o.intended_effect) || GOAL_FLOW_HINT[goal] || "";
      recs.push({
        type: goal,
        label: lab,
        message: msg,
        hint: eff,
      });
    }
    var ui = userIntentNorm || "unsure";
    return {
      flowSummary: cleanAiString(rd.current_dynamic),
      directionLine: INTENT_DIRECTION_LINE[ui] || INTENT_DIRECTION_LINE.unsure,
      recommendations: recs,
      beforeSend: cleanAiString(p.before_send_check),
    };
  }

  async function requestAiReply(input) {
    try {
      var mode = input.mode === "review" ? "review" : "generate";
      var reqBody = {
        mode: mode,
        situation: input.situation,
        other_message: input.other_message,
        user_goal: input.user_goal,
      };
      if (mode === "review") {
        reqBody.candidate_reply = input.candidate_reply;
      }

      var res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      var json;
      try {
        json = await res.json();
      } catch (e0) {
        return null;
      }
      if (!json || typeof json !== "object") return null;
      if (json.use_fallback === true) return null;
      if (!res.ok) return null;
      if (json.error) return null;

      if (mode === "review") {
        var rv = json.review;
        if (!rv || typeof rv !== "object") return null;
        var bv = rv.better_versions;
        if (!Array.isArray(bv) || bv.length !== 3) return null;
        return { kind: "review", review: rv };
      }

      var genView = normalizeResult("ai", json, input.user_intent_norm);
      if (!genView) return null;
      return { kind: "generate", view: genView };
    } catch (e1) {
      return null;
    }
  }

  function buildLocalReviewFallback(candidateReply) {
    var c = cleanAiString(candidateReply);
    var whyish = /왤까요|왜요|왜\s*\?|왜\?/i.test(c);
    if (whyish) {
      return {
        review: {
          position: "상대가 만든 프레임에 바로 들어가지는 않는 답장입니다.",
          attraction_effect:
            "장난이 통하는 사이면 여유 있어 보일 수 있지만, 관계 온도가 낮으면 비꼬는 말처럼 들릴 수 있어요.",
          risk: "상대가 이미 예민한 상태라면 싸움으로 번질 수 있습니다.",
          usable_when: "서로 장난을 주고받는 분위기가 어느 정도 있을 때.",
          dangerous_when: "상대가 진짜로 불편함을 말하고 있거나, 최근 분위기가 차가울 때.",
          better_versions: ["들켰나 ㅋㅋ", "아 좀 티났나 ㅋㅋ", "그러게 오늘 좀 말 많았네 ㅋㅋ"],
        },
      };
    }
    return {
      review: {
        position: "한 줄로 끝낸 답장이라 부담은 작을 수 있지만, 상대가 읽는 온도에 따라 뉘앙스가 갈릴 수 있어요.",
        attraction_effect:
          "가볍게 넘기고 싶을 땐 괜찮을 수 있고, 진지한 말에는 어울리지 않을 수도 있어요.",
        risk: "상대가 이미 예민하면 대화가 어긋날 수 있어요.",
        usable_when: "서로 편하게 말하는 단계일 때.",
        dangerous_when: "갈등 직후이거나 상대가 진지한 톤일 때.",
        better_versions: ["아하 ㅋㅋ 알겠어", "오키 그럼", "음 알겠어 ㅋㅋ"],
      },
    };
  }

  function switchOutputPanels(which) {
    var genPanel = document.getElementById("panelGenerateOutput");
    var revPanel = document.getElementById("panelReviewOutput");
    if (!genPanel || !revPanel) return;
    if (which === "review") {
      genPanel.hidden = true;
      revPanel.hidden = false;
    } else {
      genPanel.hidden = false;
      revPanel.hidden = true;
    }
  }

  function clearReviewOutputFields() {
    var ids = ["reviewPosition", "reviewAttraction", "reviewRisk", "reviewUsable", "reviewDangerous"];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.textContent = "";
    }
    var vc = document.getElementById("reviewVariants");
    if (vc) vc.innerHTML = "";
  }

  function renderReviewOutput(review) {
    if (!review) return;
    document.getElementById("reviewPosition").textContent = review.position || "";
    document.getElementById("reviewAttraction").textContent = review.attraction_effect || "";
    document.getElementById("reviewRisk").textContent = review.risk || "";
    document.getElementById("reviewUsable").textContent = review.usable_when || "";
    document.getElementById("reviewDangerous").textContent = review.dangerous_when || "";

    var container = document.getElementById("reviewVariants");
    container.innerHTML = "";
    var list = review.better_versions || [];

    for (var i = 0; i < list.length; i++) {
      (function (idx, message) {
        var card = document.createElement("article");
        card.className = "review-variant-card";

        var badge = document.createElement("span");
        badge.className = "review-variant-card__index";
        badge.textContent = String(idx + 1);

        var bubble = document.createElement("p");
        bubble.className = "review-variant-card__bubble";
        bubble.textContent = message;

        var foot = document.createElement("div");
        foot.className = "review-variant-card__foot";

        var copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn btn--copy";
        copyBtn.textContent = "복사";

        var feedback = document.createElement("p");
        feedback.className = "reply-card__status";
        feedback.setAttribute("role", "status");
        feedback.setAttribute("aria-live", "polite");
        feedback.hidden = true;

        copyBtn.addEventListener("click", function () {
          tryCopyText(message)
            .then(function () {
              feedback.textContent = "복사됐어요";
              feedback.className = "reply-card__status";
              feedback.hidden = false;
            })
            .catch(function () {
              feedback.textContent = "길게 눌러 직접 복사해 주세요";
              feedback.className = "reply-card__status reply-card__status--muted";
              feedback.hidden = false;
            });
        });

        foot.appendChild(copyBtn);
        foot.appendChild(feedback);

        card.appendChild(badge);
        card.appendChild(bubble);
        card.appendChild(foot);

        container.appendChild(card);
      })(i, list[i]);
    }

    switchOutputPanels("review");
  }

  function setLoadingVisible(show, isReviewMode) {
    var c = document.getElementById("resultsContent");
    if (!c) return;
    var el = document.getElementById("generateLoadingLine");
    if (!el) {
      el = document.createElement("p");
      el.id = "generateLoadingLine";
      el.className = "placeholder";
      el.setAttribute("role", "status");
      c.insertBefore(el, c.firstChild);
    }
    el.textContent = isReviewMode ? "답장을 검수하는 중…" : "답장 후보를 불러오는 중…";
    el.hidden = !show;
  }

  function setFallbackBannerVisible(show, isReviewMode) {
    var c = document.getElementById("resultsContent");
    if (!c) return;
    var el = document.getElementById("aiFallbackBanner");
    if (!el) {
      el = document.createElement("p");
      el.id = "aiFallbackBanner";
      el.className = "fineprint";
      el.style.marginTop = "0.35rem";
      el.style.opacity = "0.82";
      var fine = document.getElementById("fineprintGenerate");
      if (fine && fine.parentNode === c) {
        c.insertBefore(el, fine);
      } else {
        c.appendChild(el);
      }
    }
    el.textContent = isReviewMode
      ? "AI 연결이 아직 준비되지 않아 참고용 검수 요약을 보여드렸어요."
      : "AI 연결이 아직 준비되지 않아 임시 답장 후보를 보여드렸어요.";
    el.hidden = !show;
  }

  function renderCoachingTop(brief, directionLine) {
    document.getElementById("situationBrief").textContent = brief;
    document.getElementById("replyGoalLine").textContent = directionLine;
  }

  function renderPreSend(text) {
    document.getElementById("preSendCheck").textContent = text || "";
  }

  function tryCopyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error("copy"));
      } catch (e) {
        reject(e);
      }
    });
  }

  function renderRecommendations(container, list) {
    container.innerHTML = "";
    var typeClass = {
      maintain_flow: "reply-card--flow",
      regain_leverage: "reply-card--leverage",
      set_boundary: "reply-card--boundary",
      reframe: "reply-card--flow",
      keep_attraction: "reply-card--leverage",
      relaxed_pullback: "reply-card--boundary",
    };
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var card = document.createElement("article");
      card.className = "reply-card " + (typeClass[item.type] || "");

      var main = document.createElement("div");
      main.className = "reply-card__body";

      var row1 = document.createElement("div");
      row1.className = "reply-card__field";
      var t1 = document.createElement("span");
      t1.className = "reply-card__tag";
      t1.textContent = "목적";
      var g = document.createElement("p");
      g.className = "reply-card__goal";
      g.textContent = item.label;
      row1.appendChild(t1);
      row1.appendChild(g);
      main.appendChild(row1);

      var row2 = document.createElement("div");
      row2.className = "reply-card__field";
      var t2 = document.createElement("span");
      t2.className = "reply-card__tag";
      t2.textContent = "보낼 말";
      var bubble = document.createElement("p");
      bubble.className = "reply-card__bubble";
      bubble.textContent = item.message;
      row2.appendChild(t2);
      row2.appendChild(bubble);
      main.appendChild(row2);

      var row3 = document.createElement("div");
      row3.className = "reply-card__field";
      var t3 = document.createElement("span");
      t3.className = "reply-card__tag";
      t3.textContent = "노리는 흐름";
      var hint = document.createElement("p");
      hint.className = "reply-card__hint";
      hint.textContent = item.hint || "";
      row3.appendChild(t3);
      row3.appendChild(hint);
      main.appendChild(row3);

      card.appendChild(main);

      var foot = document.createElement("div");
      foot.className = "reply-card__foot";

      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn--copy";
      copyBtn.textContent = "복사";

      var feedback = document.createElement("p");
      feedback.className = "reply-card__status";
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      feedback.hidden = true;

      (function (message, fbEl) {
        copyBtn.addEventListener("click", function () {
          tryCopyText(message)
            .then(function () {
              fbEl.textContent = "복사됐어요";
              fbEl.className = "reply-card__status";
              fbEl.hidden = false;
            })
            .catch(function () {
              fbEl.textContent = "길게 눌러 직접 복사해 주세요";
              fbEl.className = "reply-card__status reply-card__status--muted";
              fbEl.hidden = false;
            });
        });
      })(item.message, feedback);

      foot.appendChild(copyBtn);
      foot.appendChild(feedback);
      card.appendChild(foot);

      container.appendChild(card);
    }
  }

  function clearResultDom() {
    renderCoachingTop("", "");
    renderPreSend("");
    document.getElementById("recommendations").innerHTML = "";
    clearReviewOutputFields();
    switchOutputPanels("generate");
    setLoadingVisible(false, false);
    setFallbackBannerVisible(false, false);
  }

  function getEls() {
    return {
      testScenario: document.getElementById("testScenario"),
      situation: document.getElementById("situation"),
      otherMessage: document.getElementById("otherMessage"),
      candidateReply: document.getElementById("candidateReply"),
      fieldCandidateWrap: document.getElementById("fieldCandidateWrap"),
      fieldScenario: document.querySelector(".field--scenario"),
      userIntent: document.getElementById("userIntent"),
      hint: document.getElementById("resultsHint"),
      hintReview: document.getElementById("resultsHintReview"),
      err: document.getElementById("resultsError"),
      content: document.getElementById("resultsContent"),
      rec: document.getElementById("recommendations"),
      btnMore: document.getElementById("btnMoreReplies"),
      btnSubmit: document.getElementById("btnSubmit"),
      btnModeGenerate: document.getElementById("btnModeGenerate"),
      btnModeReview: document.getElementById("btnModeReview"),
    };
  }

  function syncModeUi() {
    var els = getEls();
    var isReview = currentMode === "review";

    if (els.btnModeGenerate && els.btnModeReview) {
      els.btnModeGenerate.classList.toggle("mode-switch__btn--active", !isReview);
      els.btnModeReview.classList.toggle("mode-switch__btn--active", isReview);
      els.btnModeGenerate.setAttribute("aria-selected", !isReview ? "true" : "false");
      els.btnModeReview.setAttribute("aria-selected", isReview ? "true" : "false");
    }

    if (els.fieldCandidateWrap) els.fieldCandidateWrap.hidden = !isReview;
    if (els.fieldScenario) els.fieldScenario.hidden = isReview;

    if (els.hint) els.hint.hidden = isReview;
    if (els.hintReview) els.hintReview.hidden = !isReview;

    if (els.btnSubmit) {
      els.btnSubmit.textContent = isReview ? "내 답장 검수하기" : "반응 골라보기";
    }

    if (els.btnMore) els.btnMore.hidden = true;
  }

  function applyScenarioFromSelect() {
    var els = getEls();
    var id = els.testScenario.value;
    if (id === "manual") return;
    var preset = SCENARIO_PRESETS[id];
    if (!preset) return;
    els.situation.value = preset.situation;
    els.otherMessage.value = preset.otherMessage;
    els.userIntent.value = preset.intent;
    if (els.candidateReply) els.candidateReply.value = "";
    els.err.hidden = true;
    els.err.textContent = "";
    els.content.hidden = true;
    clearResultDom();
    els.hint.hidden = false;
    lastRenderedMessages = [];
    lastTriple = null;
    lastSourceAi = false;
    lastAiInputPayload = null;
    if (els.btnMore) els.btnMore.hidden = true;
  }

  function resetUi() {
    var els = getEls();
    els.testScenario.value = "manual";
    els.situation.value = "";
    els.otherMessage.value = "";
    if (els.candidateReply) els.candidateReply.value = "";
    els.userIntent.value = "light_continue";
    els.err.hidden = true;
    els.err.textContent = "";
    els.content.hidden = true;
    clearResultDom();
    els.hint.hidden = false;
    lastRenderedMessages = [];
    lastTriple = null;
    lastSourceAi = false;
    lastAiInputPayload = null;
    if (els.btnMore) els.btnMore.hidden = true;
  }

  function fillExample() {
    var els = getEls();
    els.testScenario.value = "manual";
    els.situation.value = EXAMPLE_SITUATION;
    els.otherMessage.value = EXAMPLE_OTHER;
    els.userIntent.value = "light_continue";
    if (els.candidateReply) els.candidateReply.value = "";
    els.err.hidden = true;
    els.err.textContent = "";
    els.content.hidden = true;
    clearResultDom();
    els.hint.hidden = false;
    lastRenderedMessages = [];
    lastTriple = null;
    lastSourceAi = false;
    lastAiInputPayload = null;
    if (els.btnMore) els.btnMore.hidden = true;
  }

  function isComplaintAboutUserInput(input) {
    var text = `${input.situation || ""} ${input.other_message || ""} ${input.user_goal || ""}`;

    return (
      text.includes("왜 이렇게 많이") ||
      text.includes("톡을 왜") ||
      text.includes("연락 좀 그만") ||
      text.includes("너무 자주") ||
      text.includes("부담스러워") ||
      text.includes("집착") ||
      text.includes("많이 보내") ||
      text.includes("그만 보내") ||
      text.includes("연락이 많")
    );
  }

  function getComplaintReframeResult() {
    return {
      relationship_read: {
        current_dynamic:
          "상대가 연락량을 부담스럽게 말한 상황. 여기서 바로 사과하고 내려가면 상대가 만든 프레임에 들어갈 수 있어요.",
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
        "여기서 장문으로 해명하면 더 쫓아가는 느낌이 날 수 있어요. 너무 세게 받아치면 싸움이 됩니다.",
    };
  }

  function pickComplaintReframeReplyVariant() {
    function pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
    return {
      relationship_read: {
        current_dynamic:
          "상대가 연락량을 부담스럽게 말한 상황. 여기서 바로 사과하고 내려가면 상대가 만든 프레임에 들어갈 수 있어요.",
      },
      reply_options: [
        {
          goal: "reframe",
          label: "프레임 전환",
          message: pick(["들켰네 ㅋㅋ", "아 좀 티났나 ㅋㅋ", "ㅋㅋ 오늘 좀 말 많았네"]),
          intended_effect: "부담스러운 사람 프레임을 무겁지 않게 비틀어 넘김",
        },
        {
          goal: "keep_attraction",
          label: "매력 유지",
          message: pick([
            "그냥 생각나서 보냈지 ㅋㅋ",
            "별건 아니고 그냥 말 걸고 싶었어",
            "아 그 정도였나 ㅋㅋ",
          ]),
          intended_effect: "관심은 보이지만 매달리는 느낌은 줄임",
        },
        {
          goal: "relaxed_pullback",
          label: "여유 있게 물러나기",
          message: pick([
            "오케이 접수 ㅋㅋ 잠깐 조용히 있을게",
            "알겠어 ㅋㅋ 나도 좀 줄일게",
            "오케이 잠깐 조용히 모드 갈게 ㅋㅋ",
          ]),
          intended_effect: "과하게 사과하지 않고 가볍게 한 발 물러남",
        },
      ],
      before_send_check:
        "여기서 장문으로 해명하면 더 쫓아가는 느낌이 날 수 있어요. 너무 세게 받아치면 싸움이 됩니다.",
    };
  }

  function setMode(nextMode) {
    currentMode = nextMode === "review" ? "review" : "generate";
    syncModeUi();
    var els = getEls();
    if (els.content && !els.content.hidden) {
      els.content.hidden = true;
      clearResultDom();
    }
    els.err.hidden = true;
    els.err.textContent = "";
    if (currentMode === "generate") {
      els.hint.hidden = false;
      if (els.hintReview) els.hintReview.hidden = true;
    } else {
      els.hint.hidden = true;
      if (els.hintReview) els.hintReview.hidden = false;
    }
  }

  async function handleGenerateResult() {
    var els = getEls();
    var situation = els.situation.value.trim();
    var otherMessage = els.otherMessage.value.trim();
    var userIntent = els.userIntent.value;
    var scenarioId = els.testScenario.value;
    var candidateRaw = els.candidateReply ? els.candidateReply.value.trim() : "";

    els.err.hidden = true;
    els.err.textContent = "";

    if (!situation || !otherMessage) {
      if (currentMode === "generate") {
        els.hint.hidden = false;
        if (els.hintReview) els.hintReview.hidden = true;
      } else {
        els.hint.hidden = true;
        if (els.hintReview) els.hintReview.hidden = false;
      }
      els.err.textContent = "상황이랑 상대 말 둘 다 적어 주세요.";
      els.err.hidden = false;
      return;
    }

    if (currentMode === "review" && !candidateRaw) {
      els.hint.hidden = true;
      if (els.hintReview) els.hintReview.hidden = false;
      els.err.textContent = "검수할 답장을 적어 주세요.";
      els.err.hidden = false;
      return;
    }

    els.hint.hidden = true;
    if (els.hintReview) els.hintReview.hidden = true;

    lastRenderedMessages = [];
    lastTriple = null;
    setFallbackBannerVisible(false, currentMode === "review");

    els.content.hidden = false;
    setLoadingVisible(true, currentMode === "review");
    renderCoachingTop("", "");
    renderPreSend("");
    els.rec.innerHTML = "";
    clearReviewOutputFields();
    switchOutputPanels("generate");

    var userIntentNorm = normalizeUserIntent(userIntent);
    lastUserIntentNorm = userIntentNorm;

    if (currentMode === "review") {
      var reviewPayload = {
        mode: "review",
        situation: situation,
        other_message: otherMessage,
        user_goal: goalTextForApi(userIntent),
        candidate_reply: candidateRaw,
        user_intent_norm: userIntentNorm,
      };

      var reviewRes = await requestAiReply(reviewPayload);
      var usedFbRev = false;
      var reviewData = null;

      if (reviewRes && reviewRes.kind === "review" && reviewRes.review) {
        reviewData = reviewRes.review;
      } else {
        usedFbRev = true;
        reviewData = buildLocalReviewFallback(candidateRaw).review;
      }

      setLoadingVisible(false, true);
      renderReviewOutput(reviewData);
      setFallbackBannerVisible(usedFbRev, true);
      lastSourceAi = !!(reviewRes && reviewRes.kind === "review") && !usedFbRev;
      lastAiInputPayload = lastSourceAi ? reviewPayload : null;
      if (els.btnMore) els.btnMore.hidden = true;
      els.content.hidden = false;
      return;
    }

    var aiInput = {
      mode: "generate",
      situation: situation,
      other_message: otherMessage,
      user_goal: goalTextForApi(userIntent),
      user_intent_norm: userIntentNorm,
    };

    var complaintInput = {
      situation: situation,
      other_message: otherMessage,
      user_goal: goalTextForApi(userIntent),
    };

    if (isComplaintAboutUserInput(complaintInput)) {
      var complaintView = normalizeResult("ai", getComplaintReframeResult(), userIntentNorm);
      if (complaintView && complaintView.recommendations && complaintView.recommendations.length === 3) {
        setLoadingVisible(false, false);
        switchOutputPanels("generate");
        lastTriple = [
          complaintView.recommendations[0].message,
          complaintView.recommendations[1].message,
          complaintView.recommendations[2].message,
        ];
        pushRecentMessages(lastTriple);
        lastSourceAi = false;
        lastAiInputPayload = null;
        renderCoachingTop(complaintView.flowSummary, complaintView.directionLine);
        renderRecommendations(els.rec, complaintView.recommendations);
        renderPreSend(complaintView.beforeSend || "");
        setFallbackBannerVisible(false, false);
        els.content.hidden = false;
        if (els.btnMore) els.btnMore.hidden = false;
        return;
      }
    }

    var aiPack = await requestAiReply(aiInput);
    var view = aiPack && aiPack.kind === "generate" ? aiPack.view : null;
    if (view && (!view.recommendations || view.recommendations.length !== 3)) {
      view = null;
    }
    var usedFallback = false;

    if (!view) {
      var data = generateLocalFallbackResult(situation, otherMessage, userIntent, scenarioId, {
        userIntent: userIntentNorm,
      });
      view = normalizeResult("local", data.coaching_result);
      usedFallback = true;
      lastSourceAi = false;
      lastAiInputPayload = null;
    } else {
      lastSourceAi = true;
      lastAiInputPayload = {
        mode: "generate",
        situation: situation,
        other_message: otherMessage,
        user_goal: aiInput.user_goal,
        user_intent_norm: userIntentNorm,
      };
    }

    setLoadingVisible(false, false);
    switchOutputPanels("generate");

    var triple = [
      view.recommendations[0].message,
      view.recommendations[1].message,
      view.recommendations[2].message,
    ];
    lastTriple = triple;
    pushRecentMessages(triple);

    renderCoachingTop(view.flowSummary, view.directionLine);
    renderRecommendations(els.rec, view.recommendations);
    renderPreSend(view.beforeSend || "");
    setFallbackBannerVisible(usedFallback, false);

    els.content.hidden = false;
    if (els.btnMore) els.btnMore.hidden = false;
  }

  async function onMoreReplies() {
    var els = getEls();
    if (els.content.hidden) return;
    if (currentMode === "review") return;

    var situation = els.situation.value.trim();
    var otherMessage = els.otherMessage.value.trim();
    var userIntent = els.userIntent.value;
    var scenarioId = els.testScenario.value;
    if (!situation || !otherMessage) return;

    var userIntentNorm = normalizeUserIntent(userIntent);
    lastUserIntentNorm = userIntentNorm;
    setLoadingVisible(true, false);
    setFallbackBannerVisible(false, false);

    var complaintInputMore = {
      situation: situation,
      other_message: otherMessage,
      user_goal: goalTextForApi(userIntent),
    };
    if (isComplaintAboutUserInput(complaintInputMore)) {
      var complaintMoreView = normalizeResult("ai", pickComplaintReframeReplyVariant(), userIntentNorm);
      if (complaintMoreView && complaintMoreView.recommendations && complaintMoreView.recommendations.length === 3) {
        setLoadingVisible(false, false);
        switchOutputPanels("generate");
        lastTriple = [
          complaintMoreView.recommendations[0].message,
          complaintMoreView.recommendations[1].message,
          complaintMoreView.recommendations[2].message,
        ];
        pushRecentMessages(lastTriple);
        renderCoachingTop(complaintMoreView.flowSummary, complaintMoreView.directionLine);
        renderRecommendations(els.rec, complaintMoreView.recommendations);
        renderPreSend(complaintMoreView.beforeSend || "");
        setFallbackBannerVisible(false, false);
        return;
      }
    }

    var view = null;
    var usedFallback = false;

    if (lastSourceAi && lastAiInputPayload) {
      var pack = await requestAiReply(lastAiInputPayload);
      view = pack && pack.kind === "generate" ? pack.view : null;
      if (view && (!view.recommendations || view.recommendations.length !== 3)) {
        view = null;
      }
      if (!view) {
        usedFallback = true;
        lastSourceAi = false;
        var dataFb = generateLocalFallbackResult(situation, otherMessage, userIntent, scenarioId, {
          previousTriple: lastTriple,
          lastRenderedMessages: lastRenderedMessages,
          userIntent: userIntentNorm,
        });
        view = normalizeResult("local", dataFb.coaching_result);
      }
    } else {
      var dataLoc = generateLocalFallbackResult(situation, otherMessage, userIntent, scenarioId, {
        previousTriple: lastTriple,
        lastRenderedMessages: lastRenderedMessages,
        userIntent: userIntentNorm,
      });
      view = normalizeResult("local", dataLoc.coaching_result);
    }

    setLoadingVisible(false, false);
    switchOutputPanels("generate");

    var triple = [
      view.recommendations[0].message,
      view.recommendations[1].message,
      view.recommendations[2].message,
    ];
    lastTriple = triple;
    pushRecentMessages(triple);

    renderCoachingTop(view.flowSummary, view.directionLine);
    renderRecommendations(els.rec, view.recommendations);
    renderPreSend(view.beforeSend || "");
    setFallbackBannerVisible(usedFallback, false);
  }

  document.getElementById("btnSubmit").addEventListener("click", function () {
    handleGenerateResult();
  });
  document.getElementById("btnFillExample").addEventListener("click", fillExample);
  document.getElementById("btnReset").addEventListener("click", resetUi);
  document.getElementById("testScenario").addEventListener("change", applyScenarioFromSelect);
  var moreBtn = document.getElementById("btnMoreReplies");
  if (moreBtn) moreBtn.addEventListener("click", onMoreReplies);

  var btnGen = document.getElementById("btnModeGenerate");
  var btnRev = document.getElementById("btnModeReview");
  if (btnGen) btnGen.addEventListener("click", function () { setMode("generate"); });
  if (btnRev) btnRev.addEventListener("click", function () { setMode("review"); });
  syncModeUi();

  if (typeof window !== "undefined") {
    window.generateCoachingResult = generateCoachingResult;
    window.generateLocalFallbackResult = generateLocalFallbackResult;
    window.requestAiReply = requestAiReply;
  }
})();
