export const FEATURE_FLAGS = {
  office: "OFFICE_ENABLED",
  aiShadow: "AI_SHADOW_ENABLED",
  aiDrafts: "AI_DRAFTS_ENABLED",
  aiAutoReply: "AI_AUTO_REPLY_ENABLED",
  bookingAgent: "BOOKING_AGENT_ENABLED",
  marketingAutomation: "MARKETING_AUTOMATION_ENABLED",
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return process.env[FEATURE_FLAGS[flag]]?.trim().toLowerCase() === "true";
}
