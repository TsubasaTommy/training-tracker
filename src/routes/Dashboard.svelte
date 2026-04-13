<script lang="ts">
  import { format, subDays } from "date-fns";
  import type { BodyWeight, Exercise, Sex } from "../lib/types";
  import { MUSCLE_GROUPS, muscleLabel } from "../lib/types";
  import { exercisesStore } from "../lib/stores/exercises";
  import { getSetsBetween, type SetWithExercise } from "../lib/db/sets";
  import {
    avgWeeklySetsByMuscle,
    distinctDayCount,
    evaluateWeeklyVolume,
    exerciseRanking,
    frequencyByDayOfWeek,
    maxOneRmByDate,
    statsByExercise,
    totalVolumeByDate,
  } from "../lib/calc/aggregate";
  import {
    getLatestBodyWeight,
    listBodyWeights,
  } from "../lib/db/bodyweights";
  import { getSetting, setSetting } from "../lib/db/settings";
  import {
    classifyTier,
    lookupStandard,
    TIER_COLOR,
    TIER_LABEL,
    type StrengthTier,
  } from "../lib/strengthStandards";
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
  let latestBw = $state<BodyWeight | null>(null);
  let bwSeries = $state<BodyWeight[]>([]);
  let sex = $state<Sex>("male");

  async function reload() {
    loading = true;
    [sets, latestBw, bwSeries] = await Promise.all([
      getSetsBetween(from, to, muscleFilter || null),
      getLatestBodyWeight(),
      listBodyWeights(from, to),
    ]);
    const sxRaw = await getSetting("sex");
    if (sxRaw === "female" || sxRaw === "male") sex = sxRaw;
    loading = false;
  }

  async function onChangeSex(e: Event) {
    const v = (e.target as HTMLSelectElement).value as Sex;
    sex = v;
    await setSetting("sex", v);
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

  // ---- 体重まわり ----
  const bwForRatio = $derived(latestBw?.weight_kg ?? null);
  const bwSeriesData = $derived(
    bwSeries.map((b) => ({ date: b.recorded_on, value: b.weight_kg }))
  );

  const relativeVolume = $derived(
    bwForRatio && bwForRatio > 0 ? totalVolume / bwForRatio : null
  );

  // ---- Strength Standards 評価 ----
  interface StandardRow {
    name: string;
    oneRm: number;
    ratio: number;
    tier: StrengthTier;
    thresholds: { novice: number; intermediate: number; advanced: number; elite: number };
  }
  const standardRows = $derived.by<StandardRow[]>(() => {
    if (!bwForRatio) return [];
    const rows: StandardRow[] = [];
    for (const st of stats) {
      const std = lookupStandard(st.name);
      if (!std || st.maxOneRm <= 0) continue;
      const ratio = st.maxOneRm / bwForRatio;
      const thresholds = std[sex];
      rows.push({
        name: st.name,
        oneRm: st.maxOneRm,
        ratio,
        tier: classifyTier(ratio, thresholds),
        thresholds,
      });
    }
    // Tier順 (高い順) > 比率順
    const order: Record<StrengthTier, number> = {
      elite: 4,
      advanced: 3,
      intermediate: 2,
      novice: 1,
      untrained: 0,
    };
    return rows.sort(
      (a, b) => order[b.tier] - order[a.tier] || b.ratio - a.ratio
    );
  });

  // ---- 部位別 週あたり平均セット数 (Schoenfeld) ----
  const weeklySets = $derived(avgWeeklySetsByMuscle(sets));
  const weeklyRows = $derived(
    MUSCLE_GROUPS.map((mg) => {
      const v = weeklySets[mg.value] ?? 0;
      return {
        muscle: mg.label,
        muscleKey: mg.value,
        sets: v,
        status: evaluateWeeklyVolume(v),
      };
    })
  );

  const STATUS_LABEL: Record<string, string> = {
    low: "不足",
    maintain: "維持",
    optimal: "最適",
    excess: "過剰の可能性",
  };
  const STATUS_COLOR: Record<string, string> = {
    low: "#ef4444",
    maintain: "#f59e0b",
    optimal: "#10b981",
    excess: "#a855f7",
  };
</script>

<div class="flex flex-col gap-5">
  <header class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">ダッシュボード</h1>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <label class="label" for="sex">性別</label>
        <select id="sex" class="input" value={sex} onchange={onChangeSex}>
          <option value="male">男性</option>
          <option value="female">女性</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="label" for="mg">部位</label>
        <select id="mg" class="input" bind:value={muscleFilter}>
          <option value="">全て</option>
          {#each MUSCLE_GROUPS as g (g.value)}
            <option value={g.value}>{g.label}</option>
          {/each}
        </select>
      </div>
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
      sub={relativeVolume != null
        ? `相対: ${relativeVolume.toFixed(0)}× 体重`
        : "体重未登録"}
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
    <StatCard
      label="最新体重"
      value={latestBw ? `${latestBw.weight_kg} kg` : "—"}
      sub={latestBw ? latestBw.recorded_on : "記録画面で入力"}
      accent="rose"
    />
  </div>

  <!-- 体重推移 -->
  <div class="card">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">体重推移</h2>
      <span class="text-xs text-slate-500">単位: kg</span>
    </div>
    {#if bwSeriesData.length === 0}
      <div class="py-8 text-center text-sm text-slate-400">
        この期間の体重記録がありません。記録画面の「体重」に入力してください。
      </div>
    {:else}
      <LineChart data={bwSeriesData} color="#e11d48" yLabel="BW (kg)" />
    {/if}
  </div>

  <!-- Strength Standards (筋力比) -->
  <div class="card">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold">筋力レベル (1RM ÷ 体重)</h2>
      <span class="text-xs text-slate-500">
        {bwForRatio
          ? `基準体重: ${bwForRatio} kg ・ 性別: ${sex === "male" ? "男性" : "女性"}`
          : "体重が必要です"}
      </span>
    </div>
    {#if !bwForRatio}
      <div class="py-8 text-center text-sm text-slate-400">
        記録画面で体重を入力すると、ベンチプレス等の主要種目の Strength Standards (初級〜エリート) を判定します。
      </div>
    {:else if standardRows.length === 0}
      <div class="py-8 text-center text-sm text-slate-400">
        対象種目 (ベンチプレス・スクワット・デッドリフト・ショルダープレス) の記録がありません。
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each standardRows as r (r.name)}
          {@const max = r.thresholds.elite * 1.1}
          {@const pct = Math.min(100, (r.ratio / max) * 100)}
          <div>
            <div class="mb-1 flex items-baseline justify-between">
              <div class="font-medium">{r.name}</div>
              <div class="text-sm">
                <span class="font-bold">{r.ratio.toFixed(2)}×</span>
                <span class="text-slate-500"> ({r.oneRm.toFixed(1)} kg)</span>
                <span
                  class="ml-2 rounded px-2 py-0.5 text-xs font-medium text-white"
                  style="background-color: {TIER_COLOR[r.tier]}"
                >
                  {TIER_LABEL[r.tier]}
                </span>
              </div>
            </div>
            <div class="relative h-3 rounded bg-slate-100">
              <!-- 各Tierのしきい値マーカー -->
              {#each [r.thresholds.novice, r.thresholds.intermediate, r.thresholds.advanced, r.thresholds.elite] as t (t)}
                <div
                  class="absolute top-0 h-full w-px bg-slate-400"
                  style="left: {Math.min(100, (t / max) * 100)}%"
                ></div>
              {/each}
              <div
                class="h-full rounded"
                style="width: {pct}%; background-color: {TIER_COLOR[r.tier]};"
              ></div>
            </div>
            <div
              class="mt-1 grid grid-cols-4 text-[10px] text-slate-500"
              style="grid-template-columns: {[
                r.thresholds.novice,
                r.thresholds.intermediate - r.thresholds.novice,
                r.thresholds.advanced - r.thresholds.intermediate,
                r.thresholds.elite - r.thresholds.advanced,
              ]
                .map((w) => `${(w / max) * 100}fr`)
                .join(' ')}"
            >
              <div>初級 {r.thresholds.novice.toFixed(2)}×</div>
              <div>中級 {r.thresholds.intermediate.toFixed(2)}×</div>
              <div>上級 {r.thresholds.advanced.toFixed(2)}×</div>
              <div>エリート {r.thresholds.elite.toFixed(2)}×</div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- 部位別 週あたり平均セット数 (Schoenfeld式) -->
  <div class="card">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold">部位別 週あたり平均セット数</h2>
      <span class="text-xs text-slate-500">
        Schoenfeld推奨: 部位ごとに週10〜20セット
      </span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      {#each weeklyRows as row (row.muscleKey)}
        <div class="flex items-center gap-2">
          <div class="w-16 shrink-0 text-sm text-slate-700">{row.muscle}</div>
          <div class="relative flex-1 h-6 rounded bg-slate-100">
            <!-- 推奨ゾーン (10-20) を薄く表示 -->
            <div
              class="absolute top-0 h-full bg-emerald-100"
              style="left: {(10 / 25) * 100}%; width: {(10 / 25) * 100}%"
            ></div>
            <div
              class="absolute top-0 h-full rounded"
              style="width: {Math.min(100, (row.sets / 25) * 100)}%; background-color: {STATUS_COLOR[row.status]};"
            ></div>
            <div
              class="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-slate-800"
            >
              {row.sets.toFixed(1)} セット/週
            </div>
          </div>
          <div
            class="w-24 shrink-0 text-xs font-medium"
            style="color: {STATUS_COLOR[row.status]}"
          >
            {STATUS_LABEL[row.status]}
          </div>
        </div>
      {/each}
    </div>
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
