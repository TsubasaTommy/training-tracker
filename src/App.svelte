<script lang="ts">
  import Router, { link, location } from "svelte-spa-router";
  import { onMount } from "svelte";
  import Record from "./routes/Record.svelte";
  import Dashboard from "./routes/Dashboard.svelte";
  import Exercises from "./routes/Exercises.svelte";
  import History from "./routes/History.svelte";
  import { ensureSeed } from "./lib/db/client";
  import { refreshExercises } from "./lib/stores/exercises";

  const routes = {
    "/": Record,
    "/dashboard": Dashboard,
    "/exercises": Exercises,
    "/history": History,
  };

  const navItems: { href: string; label: string; icon: string }[] = [
    { href: "/", label: "記録", icon: "📝" },
    { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
    { href: "/history", label: "履歴", icon: "📅" },
    { href: "/exercises", label: "種目マスタ", icon: "🏋️" },
  ];

  let ready = $state(false);

  onMount(async () => {
    await ensureSeed();
    await refreshExercises();
    ready = true;
  });

  const isActive = (href: string, loc: string) =>
    href === "/" ? loc === "/" || loc === "" : loc.startsWith(href);
</script>

<div class="flex h-screen">
  <aside class="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
    <h1 class="mb-6 text-lg font-bold text-slate-800">
      🏋️ トレーニング<br />記録
    </h1>
    <nav class="flex flex-col gap-1">
      {#each navItems as item (item.href)}
        <a
          href={item.href}
          use:link
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors {isActive(
            item.href,
            $location
          )
            ? 'bg-indigo-100 font-medium text-indigo-700'
            : 'text-slate-700 hover:bg-slate-100'}"
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>
  </aside>

  <main class="flex-1 overflow-y-auto p-6">
    {#if ready}
      <Router {routes} />
    {:else}
      <div class="flex h-full items-center justify-center text-slate-400">
        読み込み中...
      </div>
    {/if}
  </main>
</div>
