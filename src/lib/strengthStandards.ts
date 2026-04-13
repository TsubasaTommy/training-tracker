import type { MuscleGroup, Sex, ThresholdSet } from "./types";

/**
 * Strength Standards (1RM ÷ 体重) のしきい値。
 * ExRx.net / Symmetric Strength の表を参考にした近似値。
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

/** ある比率を Tier に分類 */
export function classifyTier(
  ratio: number,
  thresholds: ThresholdSet
): StrengthTier {
  if (ratio >= thresholds.elite) return "elite";
  if (ratio >= thresholds.advanced) return "advanced";
  if (ratio >= thresholds.intermediate) return "intermediate";
  if (ratio >= thresholds.novice) return "novice";
  return "untrained";
}

/**
 * 種目テンプレート: 種目名 → 標準しきい値。
 * 種目マスタの初期投入と「テンプレートから設定」UI 双方で利用。
 *
 * 倍率の意味:
 *   バーベル系: 1RM が「体重 × 倍率」相当
 *   ダンベル系: 「片手ダンベル重量 ÷ 体重」をベースに、おおよそバーベルの 40〜45% 程度を中級ライン
 */
export interface StandardsTemplate {
  name: string;
  muscleGroup: MuscleGroup;
  usesWeight: boolean;
  male: ThresholdSet;
  female: ThresholdSet;
}

export const STANDARDS_TEMPLATES: StandardsTemplate[] = [
  // ──────────── 胸 ────────────
  {
    name: "ベンチプレス",
    muscleGroup: "chest",
    usesWeight: true,
    male:   { novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.0 },
    female: { novice: 0.5,  intermediate: 0.75, advanced: 1.0,  elite: 1.25 },
  },
  {
    name: "ダンベルベンチプレス",
    muscleGroup: "chest",
    usesWeight: true,
    male:   { novice: 0.30, intermediate: 0.50, advanced: 0.70, elite: 0.85 },
    female: { novice: 0.20, intermediate: 0.30, advanced: 0.40, elite: 0.50 },
  },
  {
    name: "ダンベルフライ",
    muscleGroup: "chest",
    usesWeight: true,
    male:   { novice: 0.20, intermediate: 0.30, advanced: 0.40, elite: 0.50 },
    female: { novice: 0.10, intermediate: 0.18, advanced: 0.25, elite: 0.32 },
  },
  // ──────────── 背中 ────────────
  {
    name: "デッドリフト",
    muscleGroup: "back",
    usesWeight: true,
    male:   { novice: 1.5,  intermediate: 2.25, advanced: 2.75, elite: 3.25 },
    female: { novice: 1.0,  intermediate: 1.5,  advanced: 2.0,  elite: 2.5 },
  },
  {
    name: "ベントオーバーロウ",
    muscleGroup: "back",
    usesWeight: true,
    male:   { novice: 0.6,  intermediate: 1.0,  advanced: 1.4,  elite: 1.7 },
    female: { novice: 0.4,  intermediate: 0.6,  advanced: 0.85, elite: 1.0 },
  },
  {
    name: "ダンベルロウ",
    muscleGroup: "back",
    usesWeight: true,
    male:   { novice: 0.30, intermediate: 0.50, advanced: 0.70, elite: 0.85 },
    female: { novice: 0.18, intermediate: 0.30, advanced: 0.40, elite: 0.50 },
  },
  {
    name: "ラットプルダウン",
    muscleGroup: "back",
    usesWeight: true,
    male:   { novice: 0.6,  intermediate: 0.9,  advanced: 1.2,  elite: 1.5 },
    female: { novice: 0.4,  intermediate: 0.6,  advanced: 0.8,  elite: 1.0 },
  },
  // ──────────── 脚 ────────────
  {
    name: "スクワット",
    muscleGroup: "legs",
    usesWeight: true,
    male:   { novice: 1.25, intermediate: 1.75, advanced: 2.25, elite: 2.75 },
    female: { novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.0 },
  },
  {
    name: "ダンベルスクワット",
    muscleGroup: "legs",
    usesWeight: true,
    male:   { novice: 0.40, intermediate: 0.65, advanced: 0.90, elite: 1.10 },
    female: { novice: 0.25, intermediate: 0.40, advanced: 0.55, elite: 0.70 },
  },
  {
    name: "レッグプレス",
    muscleGroup: "legs",
    usesWeight: true,
    male:   { novice: 1.5,  intermediate: 2.5,  advanced: 3.5,  elite: 4.5 },
    female: { novice: 1.0,  intermediate: 1.7,  advanced: 2.4,  elite: 3.0 },
  },
  // ──────────── 肩 ────────────
  {
    name: "ショルダープレス",
    muscleGroup: "shoulders",
    usesWeight: true,
    male:   { novice: 0.55, intermediate: 0.75, advanced: 1.0,  elite: 1.25 },
    female: { novice: 0.35, intermediate: 0.5,  advanced: 0.65, elite: 0.8 },
  },
  {
    name: "ダンベルショルダープレス",
    muscleGroup: "shoulders",
    usesWeight: true,
    male:   { novice: 0.20, intermediate: 0.30, advanced: 0.40, elite: 0.50 },
    female: { novice: 0.12, intermediate: 0.20, advanced: 0.28, elite: 0.35 },
  },
  {
    name: "サイドレイズ",
    muscleGroup: "shoulders",
    usesWeight: true,
    male:   { novice: 0.08, intermediate: 0.13, advanced: 0.18, elite: 0.23 },
    female: { novice: 0.05, intermediate: 0.08, advanced: 0.12, elite: 0.16 },
  },
  // ──────────── 腕 ────────────
  {
    name: "アームカール",
    muscleGroup: "arms",
    usesWeight: true,
    male:   { novice: 0.35, intermediate: 0.55, advanced: 0.75, elite: 0.95 },
    female: { novice: 0.20, intermediate: 0.35, advanced: 0.45, elite: 0.55 },
  },
  {
    name: "ダンベルカール",
    muscleGroup: "arms",
    usesWeight: true,
    male:   { novice: 0.18, intermediate: 0.27, advanced: 0.37, elite: 0.47 },
    female: { novice: 0.10, intermediate: 0.17, advanced: 0.22, elite: 0.27 },
  },
  {
    name: "トライセプスエクステンション",
    muscleGroup: "arms",
    usesWeight: true,
    male:   { novice: 0.30, intermediate: 0.50, advanced: 0.70, elite: 0.90 },
    female: { novice: 0.18, intermediate: 0.30, advanced: 0.42, elite: 0.55 },
  },
];

/** 名前で template を引く */
export function findTemplate(name: string): StandardsTemplate | null {
  return STANDARDS_TEMPLATES.find((t) => t.name === name) ?? null;
}

export interface StandardEvaluation {
  exerciseName: string;
  oneRm: number;
  ratio: number;
  tier: StrengthTier;
  thresholds: ThresholdSet;
}

/** 種目自身の standards を見て評価する */
export function evaluateForExercise(
  exerciseName: string,
  oneRm: number,
  bodyweight: number,
  sex: Sex,
  thresholds: ThresholdSet | null | undefined
): StandardEvaluation | null {
  if (!thresholds) return null;
  if (bodyweight <= 0 || oneRm <= 0) return null;
  const ratio = oneRm / bodyweight;
  return {
    exerciseName,
    oneRm,
    ratio,
    tier: classifyTier(ratio, thresholds),
    thresholds,
  };
}
