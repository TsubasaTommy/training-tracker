<script lang="ts">
  import type { Exercise, MuscleGroup, ThresholdSet } from "../lib/types";
  import { MUSCLE_GROUPS, muscleLabel } from "../lib/types";
  import {
    createExercise,
    deleteExercise,
    setArchived,
    updateExercise,
  } from "../lib/db/exercises";
  import { exercisesStore, refreshExercises } from "../lib/stores/exercises";
  import {
    STANDARDS_TEMPLATES,
    findTemplate,
  } from "../lib/strengthStandards";

  let exercises = $state<Exercise[]>([]);
  $effect(() => {
    const unsub = exercisesStore.subscribe((v) => (exercises = v));
    return unsub;
  });

  // ---------- 新規追加フォーム ----------
  let newName = $state("");
  let newMuscle = $state<MuscleGroup>("chest");
  let newUsesWeight = $state(true);

  async function onAdd(e: SubmitEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      // 名前一致のテンプレートがあれば自動適用
      const tpl = findTemplate(name);
      await createExercise({
        name,
        muscle_group: newMuscle,
        uses_weight: newUsesWeight,
        standards_male: tpl?.male ?? null,
        standards_female: tpl?.female ?? null,
      });
      newName = "";
      await refreshExercises();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // ---------- 編集フォーム ----------
  let editingId = $state<number | null>(null);
  let editName = $state("");
  let editMuscle = $state<MuscleGroup>("chest");
  let editUses = $state(true);
  let editStdEnabled = $state(false);
  let editMaleNovice = $state("");
  let editMaleInter = $state("");
  let editMaleAdv = $state("");
  let editMaleElite = $state("");
  let editFemaleNovice = $state("");
  let editFemaleInter = $state("");
  let editFemaleAdv = $state("");
  let editFemaleElite = $state("");
  let templatePick = $state("");

  function startEdit(ex: Exercise) {
    editingId = ex.id;
    editName = ex.name;
    editMuscle = ex.muscle_group;
    editUses = ex.uses_weight === 1;
    if (ex.standards_male || ex.standards_female) {
      editStdEnabled = true;
      const m = ex.standards_male ?? ex.standards_female!;
      const f = ex.standards_female ?? ex.standards_male!;
      editMaleNovice = String(m.novice);
      editMaleInter = String(m.intermediate);
      editMaleAdv = String(m.advanced);
      editMaleElite = String(m.elite);
      editFemaleNovice = String(f.novice);
      editFemaleInter = String(f.intermediate);
      editFemaleAdv = String(f.advanced);
      editFemaleElite = String(f.elite);
    } else {
      editStdEnabled = false;
      editMaleNovice = editMaleInter = editMaleAdv = editMaleElite = "";
      editFemaleNovice = editFemaleInter = editFemaleAdv = editFemaleElite = "";
    }
    templatePick = "";
  }

  function applyTemplate(name: string) {
    const tpl = findTemplate(name);
    if (!tpl) return;
    editStdEnabled = true;
    editMaleNovice = String(tpl.male.novice);
    editMaleInter = String(tpl.male.intermediate);
    editMaleAdv = String(tpl.male.advanced);
    editMaleElite = String(tpl.male.elite);
    editFemaleNovice = String(tpl.female.novice);
    editFemaleInter = String(tpl.female.intermediate);
    editFemaleAdv = String(tpl.female.advanced);
    editFemaleElite = String(tpl.female.elite);
  }

  function parseThresholdSet(
    n: string,
    i: string,
    a: string,
    e: string
  ): ThresholdSet | null {
    const parse = (v: string) => {
      const x = parseFloat(v);
      return Number.isFinite(x) && x > 0 ? x : NaN;
    };
    const novice = parse(n);
    const intermediate = parse(i);
    const advanced = parse(a);
    const elite = parse(e);
    if ([novice, intermediate, advanced, elite].some(Number.isNaN)) return null;
    return { novice, intermediate, advanced, elite };
  }

  async function saveEdit(id: number) {
    let male: ThresholdSet | null = null;
    let female: ThresholdSet | null = null;
    if (editStdEnabled) {
      male = parseThresholdSet(
        editMaleNovice,
        editMaleInter,
        editMaleAdv,
        editMaleElite
      );
      female = parseThresholdSet(
        editFemaleNovice,
        editFemaleInter,
        editFemaleAdv,
        editFemaleElite
      );
      if (!male || !female) {
        alert(
          "Strength Standards を有効にしている場合、男性・女性ともに4段階のしきい値 (>0) を入力してください。"
        );
        return;
      }
    }
    await updateExercise(id, {
      name: editName,
      muscle_group: editMuscle,
      uses_weight: editUses,
      standards_male: male,
      standards_female: female,
    });
    editingId = null;
    await refreshExercises();
  }

  async function onArchive(ex: Exercise) {
    await setArchived(ex.id, ex.archived === 0);
    await refreshExercises();
  }

  async function onDelete(ex: Exercise) {
    if (!confirm(`「${ex.name}」を削除しますか？`)) return;
    try {
      await deleteExercise(ex.id);
      await refreshExercises();
    } catch (err) {
      alert((err as Error).message);
    }
  }
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-2xl font-bold">種目マスタ</h1>

  <form onsubmit={onAdd} class="card flex flex-wrap items-end gap-3">
    <div class="flex flex-col">
      <label class="label" for="ex-name">種目名</label>
      <input
        id="ex-name"
        type="text"
        class="input w-56"
        placeholder="例: インクラインベンチプレス"
        bind:value={newName}
        required
      />
    </div>
    <div class="flex flex-col">
      <label class="label" for="ex-muscle">部位</label>
      <select id="ex-muscle" class="input" bind:value={newMuscle}>
        {#each MUSCLE_GROUPS as g (g.value)}
          <option value={g.value}>{g.label}</option>
        {/each}
      </select>
    </div>
    <label class="flex items-center gap-1 text-sm">
      <input type="checkbox" bind:checked={newUsesWeight} />
      重量あり
    </label>
    <button type="submit" class="btn-primary">追加</button>
    <span class="text-xs text-slate-500">
      組み込み種目名と一致すると Strength Standards も自動設定されます
    </span>
  </form>

  <div class="card overflow-hidden p-0">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500">
        <tr>
          <th class="px-4 py-2 text-left">種目名</th>
          <th class="px-4 py-2 text-left">部位</th>
          <th class="px-4 py-2 text-left">重量</th>
          <th class="px-4 py-2 text-left">基準値</th>
          <th class="px-4 py-2 text-left">状態</th>
          <th class="px-4 py-2 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {#each exercises as ex (ex.id)}
          <tr class="border-t border-slate-100 align-top {ex.archived ? 'bg-slate-50 text-slate-400' : ''}">
            {#if editingId === ex.id}
              <td class="px-4 py-2" colspan="6">
                <!-- ─── 編集モード ─── -->
                <div class="flex flex-col gap-3">
                  <div class="flex flex-wrap items-end gap-3">
                    <div class="flex flex-col">
                      <span class="label">種目名</span>
                      <input class="input w-56" bind:value={editName} />
                    </div>
                    <div class="flex flex-col">
                      <span class="label">部位</span>
                      <select class="input" bind:value={editMuscle}>
                        {#each MUSCLE_GROUPS as g (g.value)}
                          <option value={g.value}>{g.label}</option>
                        {/each}
                      </select>
                    </div>
                    <label class="flex items-center gap-1 text-sm">
                      <input type="checkbox" bind:checked={editUses} />
                      重量あり
                    </label>
                  </div>

                  <!-- ─── Strength Standards 設定 ─── -->
                  <div class="rounded border border-slate-200 p-3">
                    <div class="mb-2 flex flex-wrap items-center gap-3">
                      <label class="flex items-center gap-1 text-sm font-medium">
                        <input
                          type="checkbox"
                          bind:checked={editStdEnabled}
                        />
                        Strength Standards (1RM÷体重) を設定する
                      </label>
                      <div class="ml-auto flex items-center gap-2">
                        <span class="label">テンプレートから設定</span>
                        <select
                          class="input"
                          bind:value={templatePick}
                          onchange={() =>
                            templatePick && applyTemplate(templatePick)}
                        >
                          <option value="">選択...</option>
                          {#each STANDARDS_TEMPLATES as t (t.name)}
                            <option value={t.name}>{t.name}</option>
                          {/each}
                        </select>
                      </div>
                    </div>

                    {#if editStdEnabled}
                      <div class="flex flex-col gap-2 text-sm">
                        <div class="grid grid-cols-[60px_1fr_1fr_1fr_1fr] items-center gap-2">
                          <span class="label">　</span>
                          <span class="label">初級</span>
                          <span class="label">中級</span>
                          <span class="label">上級</span>
                          <span class="label">エリート</span>
                        </div>
                        <div class="grid grid-cols-[60px_1fr_1fr_1fr_1fr] items-center gap-2">
                          <span class="text-xs">男性</span>
                          <input class="input" type="text" inputmode="decimal" bind:value={editMaleNovice} />
                          <input class="input" type="text" inputmode="decimal" bind:value={editMaleInter} />
                          <input class="input" type="text" inputmode="decimal" bind:value={editMaleAdv} />
                          <input class="input" type="text" inputmode="decimal" bind:value={editMaleElite} />
                        </div>
                        <div class="grid grid-cols-[60px_1fr_1fr_1fr_1fr] items-center gap-2">
                          <span class="text-xs">女性</span>
                          <input class="input" type="text" inputmode="decimal" bind:value={editFemaleNovice} />
                          <input class="input" type="text" inputmode="decimal" bind:value={editFemaleInter} />
                          <input class="input" type="text" inputmode="decimal" bind:value={editFemaleAdv} />
                          <input class="input" type="text" inputmode="decimal" bind:value={editFemaleElite} />
                        </div>
                        <div class="text-xs text-slate-500">
                          値は「1RM ÷ 体重」の倍率。例: ベンチプレス 男性中級 = 1.25 (体重70kg → 87.5kg)
                        </div>
                      </div>
                    {/if}
                  </div>

                  <div class="flex justify-end gap-2">
                    <button class="btn-ghost" onclick={() => (editingId = null)}>
                      キャンセル
                    </button>
                    <button class="btn-primary" onclick={() => saveEdit(ex.id)}>
                      保存
                    </button>
                  </div>
                </div>
              </td>
            {:else}
              <td class="px-4 py-2 font-medium">{ex.name}</td>
              <td class="px-4 py-2">{muscleLabel(ex.muscle_group)}</td>
              <td class="px-4 py-2">{ex.uses_weight ? "あり" : "自重"}</td>
              <td class="px-4 py-2 text-xs">
                {#if ex.standards_male || ex.standards_female}
                  <span class="text-emerald-700">設定済</span>
                {:else}
                  <span class="text-slate-400">なし</span>
                {/if}
              </td>
              <td class="px-4 py-2">{ex.archived ? "アーカイブ" : "有効"}</td>
              <td class="px-4 py-2 text-right whitespace-nowrap">
                <button class="btn-ghost" onclick={() => startEdit(ex)}>編集</button>
                <button class="btn-ghost" onclick={() => onArchive(ex)}>
                  {ex.archived ? "復活" : "アーカイブ"}
                </button>
                <button class="btn-ghost text-rose-600" onclick={() => onDelete(ex)}>
                  削除
                </button>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
