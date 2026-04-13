import Dexie, { type EntityTable } from "dexie";
import type { Exercise, WorkoutSet } from "../types";

/**
 * IndexedDBスキーマ
 *  - exercises: 種目マスタ
 *  - sets: トレーニングセット (1行 = 1セット)
 *
 * インデックス:
 *  - sets.performed_on            … 日付検索
 *  - sets.[exercise_id+performed_on] … 種目別の期間検索
 */
export class TrainingDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  sets!: EntityTable<WorkoutSet, "id">;

  constructor() {
    super("training-tracker");
    this.version(1).stores({
      exercises: "++id, &name, muscle_group, archived",
      sets: "++id, performed_on, exercise_id, [exercise_id+performed_on]",
    });
  }
}

export const db = new TrainingDB();

const DEFAULT_EXERCISES: Omit<Exercise, "id">[] = [
  { name: "ベンチプレス",      muscle_group: "chest",     uses_weight: 1, archived: 0, created_at: "" },
  { name: "ダンベルフライ",    muscle_group: "chest",     uses_weight: 1, archived: 0, created_at: "" },
  { name: "腕立て伏せ",        muscle_group: "chest",     uses_weight: 0, archived: 0, created_at: "" },
  { name: "デッドリフト",      muscle_group: "back",      uses_weight: 1, archived: 0, created_at: "" },
  { name: "懸垂",              muscle_group: "back",      uses_weight: 0, archived: 0, created_at: "" },
  { name: "ラットプルダウン",  muscle_group: "back",      uses_weight: 1, archived: 0, created_at: "" },
  { name: "スクワット",        muscle_group: "legs",      uses_weight: 1, archived: 0, created_at: "" },
  { name: "レッグプレス",      muscle_group: "legs",      uses_weight: 1, archived: 0, created_at: "" },
  { name: "ショルダープレス",  muscle_group: "shoulders", uses_weight: 1, archived: 0, created_at: "" },
  { name: "サイドレイズ",      muscle_group: "shoulders", uses_weight: 1, archived: 0, created_at: "" },
  { name: "アームカール",      muscle_group: "arms",      uses_weight: 1, archived: 0, created_at: "" },
  { name: "トライセプスエクステンション", muscle_group: "arms", uses_weight: 1, archived: 0, created_at: "" },
  { name: "プランク",          muscle_group: "core",      uses_weight: 0, archived: 0, created_at: "" },
];

/** 初回起動時にデフォルト種目を投入 */
export async function ensureSeed(): Promise<void> {
  const count = await db.exercises.count();
  if (count > 0) return;
  const now = new Date().toISOString();
  await db.exercises.bulkAdd(
    DEFAULT_EXERCISES.map((e) => ({ ...e, created_at: now })) as Exercise[]
  );
}
