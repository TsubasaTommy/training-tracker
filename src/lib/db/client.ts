import Dexie, { type EntityTable } from "dexie";
import type { BodyWeight, Exercise, Setting, WorkoutSet } from "../types";
import { STANDARDS_TEMPLATES } from "../strengthStandards";

/**
 * IndexedDBスキーマ
 *  - exercises:   種目マスタ (name, muscle_group, uses_weight, archived, standards_male/female)
 *  - sets:        トレーニングセット (1行 = 1セット)
 *  - bodyweights: 1日1件の体重記録
 *  - settings:    keyValue型の設定 (sex 等)
 */
export class TrainingDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  sets!: EntityTable<WorkoutSet, "id">;
  bodyweights!: EntityTable<BodyWeight, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("training-tracker");
    this.version(1).stores({
      exercises: "++id, &name, muscle_group, archived",
      sets: "++id, performed_on, exercise_id, [exercise_id+performed_on]",
    });
    this.version(2).stores({
      exercises: "++id, &name, muscle_group, archived",
      sets: "++id, performed_on, exercise_id, [exercise_id+performed_on]",
      bodyweights: "++id, &recorded_on",
      settings: "&key",
    });
    // v3: exercises に standards_male / standards_female を追加 (非インデックス)
    // 既存レコードの不足分はテンプレートから補完
    this.version(3)
      .stores({
        exercises: "++id, &name, muscle_group, archived",
        sets: "++id, performed_on, exercise_id, [exercise_id+performed_on]",
        bodyweights: "++id, &recorded_on",
        settings: "&key",
      })
      .upgrade(async (tx) => {
        const table = tx.table("exercises");
        const all = (await table.toArray()) as Exercise[];
        for (const ex of all) {
          if (ex.standards_male || ex.standards_female) continue;
          const tpl = STANDARDS_TEMPLATES.find((t) => t.name === ex.name);
          if (!tpl) continue;
          await table.update(ex.id, {
            standards_male: tpl.male,
            standards_female: tpl.female,
          });
        }
      });
  }
}

export const db = new TrainingDB();

/** 初期投入種目 (テンプレートから生成) + 自重種目 */
const DEFAULT_EXERCISES: Omit<Exercise, "id">[] = [
  // テンプレート由来 (Strength Standards 設定済み)
  ...STANDARDS_TEMPLATES.map((t) => ({
    name: t.name,
    muscle_group: t.muscleGroup,
    uses_weight: t.usesWeight ? 1 : 0,
    archived: 0,
    created_at: "",
    standards_male: t.male,
    standards_female: t.female,
  })),
  // 自重 / 標準なし
  { name: "腕立て伏せ", muscle_group: "chest", uses_weight: 0, archived: 0, created_at: "" },
  { name: "懸垂",       muscle_group: "back",  uses_weight: 0, archived: 0, created_at: "" },
  { name: "プランク",   muscle_group: "core",  uses_weight: 0, archived: 0, created_at: "" },
];

/**
 * 起動時に呼ぶ:
 *  - 初回 (種目0件) なら全 DEFAULT_EXERCISES を投入
 *  - 既存ユーザーには、新規追加された組み込み種目 (名前一致しないもの) のみ追加
 *    → 過去のアプリ更新でダンベル系などが追加されても自動補完される
 */
export async function ensureSeed(): Promise<void> {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map((e) => e.name));
  const toAdd = DEFAULT_EXERCISES.filter((e) => !existingNames.has(e.name));
  if (toAdd.length === 0) return;
  const now = new Date().toISOString();
  await db.exercises.bulkAdd(
    toAdd.map((e) => ({ ...e, created_at: now })) as Exercise[]
  );
}
