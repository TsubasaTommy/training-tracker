import type { Sex } from "./types";

/**
 * Strength Standards (1RM ÷ 体重) のしきい値。
 * ExRx.net / Symmetric Strength の表を参考にした近似値。
 * 体重に応じて若干変動するが、ここでは固定倍率で簡略化。
 */
export type StrengthTier =
  | "untrained"
  | "novice"
  | "intermediate"
  | "advanced"
  | "elite";

export const TIER_LABEL: Record<StrengthTier, string> = {
  untrained: "初心者",
  novice: "初級",
  intermediate: "中級",
  advanced: "上級",
  elite: "エリート",
};

export const TIER_COLOR: Record<StrengthTier, string> = {
  untrained: "#94a3b8",
  novice: "#10b981",
  intermediate: "#0ea5e9",
  advanced: "#6366f1",
  elite: "#f59e0b",
};

interface TierThresholds {
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

interface ExerciseStandards {
  male: TierThresholds;
  female: TierThresholds;
  /** Bench Press / Squat 等の表記揺れ吸収用 */
  aliases?: string[];
}

/**
 * 種目名をキーとする標準。重要な複合種目のみ掲載。
 * 倍率の意味: 「体重の◯倍を1RM (Epley推定) として挙げられる」
 */
export const STANDARDS: Record<string, ExerciseStandards> = {
  ベンチプレス: {
    male:   { novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.0 },
    female: { novice: 0.5,  intermediate: 0.75, advanced: 1.0,  elite: 1.25 },
    aliases: ["bench press", "bench"],
  },
  スクワット: {
    male:   { novice: 1.25, intermediate: 1.75, advanced: 2.25, elite: 2.75 },
    female: { novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.0 },
    aliases: ["squat", "back squat", "バックスクワット"],
  },
  デッドリフト: {
    male:   { novice: 1.5,  intermediate: 2.25, advanced: 2.75, elite: 3.25 },
    female: { novice: 1.0,  intermediate: 1.5,  advanced: 2.0,  elite: 2.5 },
    aliases: ["deadlift"],
  },
  ショルダープレス: {
    male:   { novice: 0.55, intermediate: 0.75, advanced: 1.0,  elite: 1.25 },
    female: { novice: 0.35, intermediate: 0.5,  advanced: 0.65, elite: 0.8 },
    aliases: ["overhead press", "ohp", "ミリタリープレス"],
  },
};

/** 種目名から STANDARDS を引く (alias 対応) */
export function lookupStandard(name: string): ExerciseStandards | null {
  if (STANDARDS[name]) return STANDARDS[name];
  const lower = name.trim().toLowerCase();
  for (const std of Object.values(STANDARDS)) {
    if (std.aliases?.some((a) => a.toLowerCase() === lower)) return std;
  }
  return null;
}

/** 1RM/体重比 を Tier に変換 */
export function classifyTier(
  ratio: number,
  thresholds: TierThresholds
): StrengthTier {
  if (ratio >= thresholds.elite) return "elite";
  if (ratio >= thresholds.advanced) return "advanced";
  if (ratio >= thresholds.intermediate) return "intermediate";
  if (ratio >= thresholds.novice) return "novice";
  return "untrained";
}

export interface StandardEvaluation {
  exerciseName: string;
  oneRm: number;
  ratio: number;
  tier: StrengthTier;
  thresholds: TierThresholds;
}

/** 体重 + 1RM + 性別 から評価結果を返す。標準にない種目は null */
export function evaluate(
  exerciseName: string,
  oneRm: number,
  bodyweight: number,
  sex: Sex
): StandardEvaluation | null {
  if (bodyweight <= 0 || oneRm <= 0) return null;
  const std = lookupStandard(exerciseName);
  if (!std) return null;
  const ratio = oneRm / bodyweight;
  const thresholds = std[sex];
  return {
    exerciseName,
    oneRm,
    ratio,
    tier: classifyTier(ratio, thresholds),
    thresholds,
  };
}
