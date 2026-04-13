<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { getDatesWithSets, getSetsForDate } from "../lib/db/sets";
  import type { Exercise, WorkoutSet } from "../lib/types";
  import { muscleLabel } from "../lib/types";
  import { exercisesStore } from "../lib/stores/exercises";
  import { epleyOneRm } from "../lib/calc/oneRm";

  let dates = $state<string[]>([]);
  let exercises = $state<Exercise[]>([]);
  let selectedDate = $state<string | null>(null);
  let selectedSets = $state<WorkoutSet[]>([]);

  $effect(() => {
    const unsub = exercisesStore.subscribe((v) => (exercises = v));
    return unsub;
  });

  onMount(async () => {
    dates = await getDatesWithSets();
    if (dates.length > 0) {
      selectedDate = dates[0];
    }
  });

  $effect(() => {
    if (selectedDate) {
      getSetsForDate(selectedDate).then((s) => (selectedSets = s));
    } else {
      selectedSets = [];
    }
  });

  const groups = $derived.by(() => {
    const map = new Map<number, WorkoutSet[]>();
    for (const s of selectedSets) {
      const list = map.get(s.exercise_id) ?? [];
      list.push(s);
      map.set(s.exercise_id, list);
    }
    const result: { exercise: Exercise; sets: WorkoutSet[] }[] = [];
    for (const [exId, list] of map.entries()) {
      const ex = exercises.find((e) => e.id === exId);
      if (!ex) continue;
      result.push({
        exercise: ex,
        sets: list.sort((a, b) => a.set_order - b.set_order),
      });
    }
    return result;
  });

  function dayTotalVolume(): number {
    return selectedSets.reduce(
      (sum, s) => sum + (s.weight_kg ?? 0) * s.reps,
      0
    );
  }

  function gotoEdit(date: string) {
    push(`/?date=${date}`);
    // シンプルにするため: 記録画面は常に今日起動し、日付入力で移動してもらう
    // 実際に使う場合はquery対応を追加する
  }

  function formatDate(d: string): string {
    const dt = new Date(d + "T00:00:00");
    const labels = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d} (${labels[dt.getDay()]})`;
  }
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-2xl font-bold">履歴</h1>

  {#if dates.length === 0}
    <div class="card text-center text-slate-500 py-12">
      まだ記録がありません
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      <div class="card p-0 overflow-hidden self-start max-h-[70vh] overflow-y-auto">
        <ul>
          {#each dates as d (d)}
            <li>
              <button
                type="button"
                class="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 {selectedDate ===
                d
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : ''}"
                onclick={() => (selectedDate = d)}
              >
                {formatDate(d)}
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <div class="flex flex-col gap-3">
        {#if selectedDate}
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{formatDate(selectedDate)}</h2>
            <div class="text-sm text-slate-500">
              {groups.length}種目・{selectedSets.length}セット・総ボリューム
              {dayTotalVolume().toLocaleString()}kg
            </div>
          </div>

          {#each groups as g (g.exercise.id)}
            <div class="card">
              <div class="mb-2 flex items-center justify-between">
                <div>
                  <div class="font-semibold">{g.exercise.name}</div>
                  <div class="text-xs text-slate-500">
                    {muscleLabel(g.exercise.muscle_group)}
                  </div>
                </div>
              </div>
              <table class="w-full text-sm">
                <thead class="text-slate-500">
                  <tr>
                    <th class="py-1 text-left w-12">#</th>
                    {#if g.exercise.uses_weight}
                      <th class="py-1 text-left">重量</th>
                    {/if}
                    <th class="py-1 text-left">回数</th>
                    {#if g.exercise.uses_weight}
                      <th class="py-1 text-left">推定1RM</th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#each g.sets as s (s.id)}
                    <tr class="border-t border-slate-100">
                      <td class="py-1 text-slate-500">{s.set_order}</td>
                      {#if g.exercise.uses_weight}
                        <td class="py-1">{s.weight_kg ?? 0} kg</td>
                      {/if}
                      <td class="py-1">{s.reps}</td>
                      {#if g.exercise.uses_weight}
                        <td class="py-1 text-slate-500">
                          {epleyOneRm(s.weight_kg, s.reps).toFixed(1)} kg
                        </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/each}

          <div>
            <button class="btn-secondary" onclick={() => gotoEdit(selectedDate!)}>
              記録画面で編集
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
