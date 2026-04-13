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

export interface Exercise {
  id: number;
  name: string;
  muscle_group: MuscleGroup;
  uses_weight: number; // 0 | 1
  archived: number; // 0 | 1
  created_at: string;
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
