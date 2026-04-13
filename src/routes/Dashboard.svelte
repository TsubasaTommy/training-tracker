<script lang="ts">
  import { format, subDays } from "date-fns";
  import type { Exercise } from "../lib/types";
  import { MUSCLE_GROUPS, muscleLabel } from "../lib/types";
  import { exercisesStore } from "../lib/stores/exercises";
  import { getSetsBetween, type SetWithExercise } from "../lib/db/sets";
  import {
    distinctDayCount,
    exerciseRanking,
    frequencyByDayOfWeek,
    maxOneRmByDate,
    statsByExercise,
    totalVolumeByDate,
  } from "../lib/calc/aggregate";
  import DateRangePicker from "../lib/components/DateRangePicker.svelte";
  import StatCard from "../lib/components/StatCard.svelte";
  import LineChart from "../lib/components/charts/LineChart.svelte";
  import BarChart from "../lib/components/charts/BarChart.svelte";

  const today = new Date();
  let from = $state(format(subDays(today, 29), "yyyy-MM-dd"));
  let to = $state(format(today, "yyyy-MM-dd"));
  let muscleFilter = $state<string>("");
  let selectedExerciseId = $state<number | null>(null);

  let exercises = $state<Exercise[]>([]);
  $effect(() => {
    const unsub = exercisesStore.subscribe((v) => (exercises = v));
    return unsub;
  });

  let sets = $state<SetWithExercise[]>([]);
  let loading = $state(false);

  async function reload() {
    loading = true;
    sets = await getSetsBetween(from, to, muscleFilter || null);
    loading = false;
  }

  $effect(() => {
    from;
    to;
    muscleFilter;
    reload();
  });

  const totalVolume = $derived(
    sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * s.reps, 0)
  );
  const totalSets = $derived(sets.length);
  const dayCount = $derived(distinctDayCount(sets));

  const volumeSeries = $derived(totalVolumeByDate(sets));
  const dow = $derived(frequencyByDayOfWeek(sets));
  const ranking = $derived(exerciseRanking(sets).slice(0, 10));
  const stats = $derived(statsByExercise(sets));

  const DOW_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

  // 種目別1RM推移の対象
  const exerciseOptions = $derived(
    stats.map((st) => ({ id: st.exerciseId, name: st.name }))
  );

  $effect(() => {
    // 選択中の種目がstatsに存在しなければ先頭にリセット
    if (
      exerciseOptions.length > 0 &&
      !exerciseOptions.find((o) => o.id === selectedExerciseId)
    ) {
      selectedExerciseId = exerciseOptions[0].id;
    }
    if (exerciseOptions.length === 0) {
      selectedExerciseId = null;
    }
  });

  const oneRmSeries = $derived(
    selectedExerciseId != null ? maxOneRmByDate(sets, selectedExerciseId) : []
  );

  const topExerciseName = $derived(ranking[0]?.name ?? "—");
</script>

<div class="flex flex-col gap-5">
  <header class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">ダッシュボード</h1>
    <div class="flex items-center gap-2">
      <label class="label" for="mg">部位</label>
      <select id="mg" class="input" bind:value={muscleFilter}>
        <option value="">全て</option>
        {#each MUSCLE_GROUPS as g (g.value)}
          <option value={g.value}>{g.label}</option>
        {/each}
      </select>
    </div>
  </header>

  <div class="card">
    <DateRangePicker bind:from bind:to onchange={() => reload()} />
    <div class="mt-2 text-xs text-slate-500">
      期間: {from} 〜 {to}
      {#if loading}<span class="ml-2">読み込み中...</span>{/if}
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <StatCard label="総セット数" value={totalSets} />
    <StatCard
      label="総ボリューム"
      value={`${totalVolume.toLocaleString()} kg`}
      accent="emerald"
    />
    <StatCard
      label="実施日数"
      value={`${dayCount} 日`}
      sub={dayCount > 0 && to >= from
        ? `頻度: ${(
            dayCount /
            Math.max(
              1,
              Math.round(
                (+new Date(to) - +new Date(from)) / (1000 * 60 * 60 * 24)
              ) + 1
            ) *
            7
          ).toFixed(1)} 日/週`
        : ""}
      accent="amber"
    />
    <StatCard label="最頻種目" value={topExerciseName} accent="rose" />
  </div>

  <div class="card">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">総ボリューム推移</h2>
      <span class="text-xs text-slate-500">
        単位: kg・日ごとの合計
      </span>
    </div>
    <LineChart data={volumeSeries} color="#10b981" yLabel="Volume" />
  </div>

  <div class="card">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">推定1RM推移 (Epley)</h2>
      {#if exerciseOptions.length > 0}
        <select
          class="input"
          bind:value={selectedExerciseId}
        >
          {#each exerciseOptions as o (o.id)}
            <option value={o.id}>{o.name}</option>
          {/each}
        </select>
      {/if}
    </div>
    {#if selectedExerciseId != null}
      <LineChart data={oneRmSeries} color="#4f46e5" yLabel="1RM (kg)" />
    {:else}
      <div class="py-8 text-center text-sm text-slate-400">データなし</div>
    {/if}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="card">
      <h2 class="mb-3 font-semibold">曜日別トレーニング日数</h2>
      <BarChart
        data={dow.map((d) => ({
          label: DOW_LABEL[d.dow],
          value: d.count,
          sub: "日",
        }))}
        color="#f59e0b"
      />
    </div>

    <div class="card">
      <h2 class="mb-3 font-semibold">種目別実施セット数 TOP10</h2>
      <BarChart
        data={ranking.map((r) => ({
          label: r.name,
          value: r.count,
          sub: "セット",
        }))}
        color="#0ea5e9"
      />
    </div>
  </div>

  <div class="card overflow-hidden p-0">
    <h2 class="px-4 pt-4 pb-2 font-semibold">種目別 最大値・ボリューム</h2>
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500">
        <tr>
          <th class="px-4 py-2 text-left">種目</th>
          <th class="px-4 py-2 text-left">部位</th>
          <th class="px-4 py-2 text-right">最大重量</th>
          <th class="px-4 py-2 text-right">最大レップ</th>
          <th class="px-4 py-2 text-right">推定1RM</th>
          <th class="px-4 py-2 text-right">総セット</th>
          <th class="px-4 py-2 text-right">総ボリューム</th>
        </tr>
      </thead>
      <tbody>
        {#each stats as st (st.exerciseId)}
          <tr class="border-t border-slate-100">
            <td class="px-4 py-2 font-medium">{st.name}</td>
            <td class="px-4 py-2">{muscleLabel(st.muscleGroup as any)}</td>
            <td class="px-4 py-2 text-right">
              {st.maxWeight > 0 ? st.maxWeight.toFixed(1) + " kg" : "—"}
            </td>
            <td class="px-4 py-2 text-right">{st.maxReps}</td>
            <td class="px-4 py-2 text-right">
              {st.maxOneRm > 0 ? st.maxOneRm.toFixed(1) + " kg" : "—"}
            </td>
            <td class="px-4 py-2 text-right">{st.totalSets}</td>
            <td class="px-4 py-2 text-right">
              {st.totalVolume > 0 ? st.totalVolume.toLocaleString() + " kg" : "—"}
            </td>
          </tr>
        {/each}
        {#if stats.length === 0}
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-slate-400">
              この期間の記録はありません
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
