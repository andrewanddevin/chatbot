// Safety layer for a real-money gambling platform. Two jobs:
//
// 1. ALWAYS route signs of gambling harm / distress to help — this takes
//    priority over everything, including retrieval. We never want the bot
//    coaching someone in distress to keep playing.
// 2. Detect requests that need a human agent (account actions, disputes) so
//    the bot hands off instead of guessing.
//
// These are conservative keyword signals — deliberately erring toward routing
// to a human. Tune the phrases to your audience and languages over time.

const HARM_SIGNALS = [
  "addicted", "addiction", "gambling problem", "can't stop", "cant stop",
  "lost everything", "lost all my money", "suicidal", "kill myself",
  "self-exclude", "self exclude", "self-exclusion", "ban my account",
  "problem gambling", "help me stop", "ruining my life", "in debt because",
];

const ESCALATE_SIGNALS = [
  "speak to a human", "talk to a person", "real person", "agent",
  "supervisor", "manager", "complaint", "dispute", "this is a scam",
  "you stole", "refund me", "delete my account", "close my account",
  "delete my wallet", "delete my address", "reset my 2fa", "lost access to my",
];

function containsAny(text, list) {
  const t = text.toLowerCase();
  return list.some((s) => t.includes(s));
}

export function checkSafety(message) {
  if (containsAny(message, HARM_SIGNALS)) {
    return {
      type: "harm",
      // A calm, supportive, non-judgmental response. Does NOT encourage play.
      response:
        "It sounds like you may be going through a difficult time, and I want to make sure you get proper support rather than an automated reply. " +
        "EsportsBet offers responsible-gaming tools including deposit limits, cool-off periods, and self-exclusion — a human support agent can set these up with you right away. " +
        "If you'd like, I can connect you now. You may also find free, confidential help through organizations like BeGambleAware (begambleaware.org) or GamCare. You don't have to handle this alone.",
    };
  }
  if (containsAny(message, ESCALATE_SIGNALS)) {
    return {
      type: "escalate",
      response:
        "I understand — this is something a human support agent should handle directly, especially for anything involving your specific account. " +
        "I'm connecting you with our support team. In the meantime, if you can share a few details about what you need, it'll help them assist you faster.",
    };
  }
  return { type: "ok" };
}
