import { db } from "./client";
import type { BodyWeight } from "../types";

/** 指定日の体重を取得 */
export async function getBodyWeight(
  date: string
): Promise<BodyWeight | null> {
  return (await db.bodyweights.where("recorded_on").equals(date).first()) ?? null;
}

/** 1日1件として upsert */
export async function upsertBodyWeight(
  date: string,
  weight_kg: number
): Promise<void> {
  const existing = await getBodyWeight(date);
  if (existing) {
    await db.bodyweights.update(existing.id, { weight_kg });
  } else {
    await db.bodyweights.add({
      recorded_on: date,
      weight_kg,
      created_at: new Date().toISOString(),
    } as BodyWeight);
  }
}

export async function deleteBodyWeight(date: string): Promise<void> {
  await db.bodyweights.where("recorded_on").equals(date).delete();
}

/** 期間内の体重を時系列で返す */
export async function listBodyWeights(
  from?: string,
  to?: string
): Promise<BodyWeight[]> {
  let coll = db.bodyweights.orderBy("recorded_on");
  const list = await coll.toArray();
  return list.filter(
    (b) => (!from || b.recorded_on >= from) && (!to || b.recorded_on <= to)
  );
}

/** 全体の最新体重 (なければ null) */
export async function getLatestBodyWeight(): Promise<BodyWeight | null> {
  const list = await db.bodyweights
    .orderBy("recorded_on")
    .reverse()
    .limit(1)
    .toArray();
  return list[0] ?? null;
}

/** 指定日に最も近い体重を返す (その日以前で最新) */
export async function getBodyWeightAt(
  date: string
): Promise<BodyWeight | null> {
  const list = await db.bodyweights
    .where("recorded_on")
    .belowOrEqual(date)
    .reverse()
    .sortBy("recorded_on");
  return list[0] ?? null;
}
