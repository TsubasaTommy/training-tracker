export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "other";

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: "chest", label: "胸" },
  { value: "back", label: "背中" },
  { value: "legs", label: "脚" },
  { value: "shoulders", label: "肩" },
  { value: "arms", label: "腕" },
  { value: "core", label: "体幹" },
  { value: "other", label: "その他" },
];

export const muscleLabel = (g: MuscleGroup): string =>
  MUSCLE_GROUPS.find((m) => m.value === g)?.label ?? g;

export interface ThresholdSet {
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_group: MuscleGroup;
  uses_weight: number; // 0 | 1
  archived: number; // 0 | 1
  created_at: string;
  /** Strength Standards 用しきい値 (1RM ÷ 体重)。null のときダッシュボードで筋力比を表示しない */
  standards_male?: ThresholdSet | null;
  standards_female?: ThresholdSet | null;
}

export interface WorkoutSet {
  id: number;
  performed_on: string; // YYYY-MM-DD
  exercise_id: number;
  set_order: number;
  weight_kg: number | null;
  reps: number;
  memo: string | null;
  created_at: string;
}

/** 記録画面で1種目分をまとめて扱うためのビュー */
export interface ExerciseDaySets {
  exercise: Exercise;
  sets: WorkoutSet[];
}

/** 体重記録 (1日1件) */
export interface BodyWeight {
  id: number;
  recorded_on: string; // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
}

export type Sex = "male" | "female";

/** 単一keyの設定保存 */
export interface Setting {
  key: string;
  value: string;
}
