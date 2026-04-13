<script lang="ts">
  import { format } from "date-fns";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { querystring } from "svelte-spa-router";
  import type { Exercise, ExerciseDaySets, WorkoutSet } from "../lib/types";
  import { muscleLabel } from "../lib/types";
  import {
    addSet,
    deleteExerciseDay,
    deleteSet,
    getSetsForDate,
    updateSet,
  } from "../lib/db/sets";
  import { exercisesStore } from "../lib/stores/exercises";
  import { epleyOneRm } from "../lib/calc/oneRm";
  import {
    getBodyWeight,
    upsertBodyWeight,
    deleteBodyWeight,
  } from "../lib/db/bodyweights";
  import ExerciseSelectModal from "../lib/components/ExerciseSelectModal.svelte";

  /** URLのクエリストリングから ?date=YYYY-MM-DD を取り出す。なければ今日。 */
  function dateFromQuery(qs: string | undefined): string {
    if (qs) {
      const params = new URLSearchParams(qs);
      const d = params.get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    }
    return format(new Date(), "yyyy-MM-dd");
  }

  // 初回マウント時にURL ?date=... を反映 (履歴画面からの遷移用)
  let performedOn = $state(dateFromQuery(get(querystring)));
  let sets = $state<WorkoutSet[]>([]);
  let showPicker = $state(false);
  let exercises = $state<Exercise[]>([]);
  let bodyWeightInput = $state<string>("");

  $effect(() => {
    const unsub = exercisesStore.subscribe((list) => (exercises = list));
    return unsub;
  });

  // URL ?date= の変化を監視 (記録画面が既にマウント済みのまま履歴から再遷移するケース対応)
  $effect(() => {
    const unsub = querystring.subscribe((qs) => {
      const next = dateFromQuery(qs);
      if (next !== performedOn) performedOn = next;
    });
    return unsub;
  });

  async function reload() {
    sets = await getSetsForDate(performedOn);
    const bw = await getBodyWeight(performedOn);
    bodyWeightInput = bw ? String(bw.weight_kg) : "";
  }

  onMount(reload);

  $effect(() => {
    // performedOnが変わったら再読み込み
    performedOn;
    reload();
  });

  async function saveBodyWeight() {
    const trimmed = bodyWeightInput.trim();
    if (trimmed === "") {
      await deleteBodyWeight(performedOn);
      return;
    }
    const v = parseFloat(trimmed);
    if (!Number.isFinite(v) || v <= 0) return;
    await upsertBodyWeight(performedOn, v);
  }

  /** 種目ごとにグループ化 */
  const groups = $derived.by<ExerciseDaySets[]>(() => {
    const byEx = new Map<number, WorkoutSet[]>();
    for (const s of sets) {
      const arr = byEx.get(s.exercise_id) ?? [];
      arr.push(s);
      byEx.set(s.exercise_id, arr);
    }
    const result: ExerciseDaySets[] = [];
    for (const [exId, list] of byEx.entries()) {
      const ex = exercises.find((e) => e.id === exId);
      if (!ex) continue;
      result.push({
        exercise: ex,
        sets: list.sort((a, b) => a.set_order - b.set_order),
      });
    }
    return result;
  });

  const usedIds = $derived(groups.map((g) => g.exercise.id));

  async function onAddExercise(ex: Exercise) {
    showPicker = false;
    // 新規にその種目の最初のセットを追加
    await addSet({
      performed_on: performedOn,
      exercise_id: ex.id,
      weight_kg: ex.uses_weight ? 0 : null,
      reps: 0,
    });
    await reload();
  }

  async function onAddSet(ex: Exercise, previous?: WorkoutSet) {
    // 前セットの値をコピーして追加
    await addSet({
      performed_on: performedOn,
      exercise_id: ex.id,
      weight_kg: ex.uses_weight ? previous?.weight_kg ?? 0 : null,
      reps: previous?.reps ?? 0,
    });
    await reload();
  }

  async function onUpdateSet(
    s: WorkoutSet,
    patch: { weight_kg?: number | null; reps?: number }
  ) {
    await updateSet(s.id, {
      weight_kg: patch.weight_kg !== undefined ? patch.weight_kg : s.weight_kg,
      reps: patch.reps !== undefined ? patch.reps : s.reps,
      memo: s.memo,
    });
    await reload();
  }

  async function onDeleteSet(s: WorkoutSet) {
    await deleteSet(s.id);
    await reload();
  }

  async function onDeleteExercise(exId: number) {
    if (!confirm("この種目の記録をすべて削除しますか？")) return;
    await deleteExerciseDay(performedOn, exId);
    await reload();
  }

  function dayTotal(g: ExerciseDaySets): { volume: number; oneRm: number } {
    let volume = 0;
    let oneRm = 0;
    for (const s of g.sets) {
      if (s.weight_kg != null) volume += s.weight_kg * s.reps;
      const r = epleyOneRm(s.weight_kg, s.reps);
      if (r > oneRm) oneRm = r;
    }
    return { volume, oneRm };
  }
</script>

<div class="flex flex-col gap-4">
  <header class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">トレーニング記録</h1>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <label class="label" for="bw-input">体重</label>
        <input
          id="bw-input"
          type="number"
          step="0.1"
          min="0"
          placeholder="kg"
          class="input w-20"
          bind:value={bodyWeightInput}
          onblur={saveBodyWeight}
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="label" for="date-input">日付</label>
        <input id="date-input" type="date" class="input" bind:value={performedOn} />
      </div>
    </div>
  </header>

  {#if groups.length === 0}
    <div class="card flex flex-col items-center justify-center gap-3 py-12">
      <p class="text-slate-500">この日の記録はまだありません</p>
      <button class="btn-primary" onclick={() => (showPicker = true)}>
        ＋ 種目を追加
      </button>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      {#each groups as g (g.exercise.id)}
        {@const totals = dayTotal(g)}
        <div class="card">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <div class="text-lg font-semibold">{g.exercise.name}</div>
              <div class="text-xs text-slate-500">
                {muscleLabel(g.exercise.muscle_group)}
                ・{g.sets.length}セット
                {#if g.exercise.uses_weight}
                  ・総ボリューム {totals.volume.toLocaleString()}kg
                  ・推定1RM {totals.oneRm.toFixed(1)}kg
                {/if}
              </div>
            </div>
            <button
              class="btn-ghost text-rose-600 hover:bg-rose-50"
              onclick={() => onDeleteExercise(g.exercise.id)}
              aria-label="種目を削除">🗑 種目削除</button
            >
          </div>

          <table class="w-full text-sm">
            <thead class="text-slate-500">
              <tr>
                <th class="py-1 text-left w-12">#</th>
                {#if g.exercise.uses_weight}
                  <th class="py-1 text-left">重量(kg)</th>
                {/if}
                <th class="py-1 text-left">回数</th>
                {#if g.exercise.uses_weight}
                  <th class="py-1 text-left">推定1RM</th>
                {/if}
                <th class="py-1 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {#each g.sets as s (s.id)}
                <tr class="border-t border-slate-100">
                  <td class="py-1 text-slate-500">{s.set_order}</td>
                  {#if g.exercise.uses_weight}
                    <td class="py-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        class="input w-24"
                        value={s.weight_kg ?? 0}
                        onchange={(e) =>
                          onUpdateSet(s, {
                            weight_kg: parseFloat(
                              (e.target as HTMLInputElement).value
                            ) || 0,
                          })}
                      />
                    </td>
                  {/if}
                  <td class="py-1">
                    <input
                      type="number"
                      min="0"
                      class="input w-20"
                      value={s.reps}
                      onchange={(e) =>
                        onUpdateSet(s, {
                          reps:
                            parseInt((e.target as HTMLInputElement).value, 10) ||
                            0,
                        })}
                    />
                  </td>
                  {#if g.exercise.uses_weight}
                    <td class="py-1 text-slate-500">
                      {epleyOneRm(s.weight_kg, s.reps).toFixed(1)}
                    </td>
                  {/if}
                  <td class="py-1 text-right">
                    <button
                      class="btn-ghost text-rose-600"
                      onclick={() => onDeleteSet(s)}
                      aria-label="セット削除">🗑</button
                    >
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>

          <button
            class="btn-secondary mt-3"
            onclick={() => onAddSet(g.exercise, g.sets[g.sets.length - 1])}
          >
            ＋ セットを追加
          </button>
        </div>
      {/each}

      <button class="btn-primary self-start" onclick={() => (showPicker = true)}>
        ＋ 種目を追加
      </button>
    </div>
  {/if}
</div>

{#if showPicker}
  <ExerciseSelectModal
    {exercises}
    excludeIds={usedIds}
    onselect={onAddExercise}
    onclose={() => (showPicker = false)}
  />
{/if}
