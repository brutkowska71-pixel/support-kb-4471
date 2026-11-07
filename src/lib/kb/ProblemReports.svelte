<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByProblem, type Problem } from '#lib/kb/problems';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  // A few reports of one problem, straight from the export, so the reader sees what they say.
  let { ticket, problem, limit = 3 }: { ticket: number; problem: Problem; limit?: number } = $props();

  const group = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove).find((g) => g.problem === problem));
  const shown = $derived(group ? group.reports.slice(0, limit) : []);
</script>

<ul class="reports">
  {#each shown as r (r.id)}
    <li><code>{r.id}</code> · {r.tenant} · {r.channel} — “{r.body}”</li>
  {/each}
</ul>
{#if group && group.reports.length > shown.length}
  <p class="more">{group.reports.length - shown.length} more like these in the export.</p>
{/if}

<style>
  .reports { padding-left: 1.1rem; font-size: 0.92rem; }
  .more { color: var(--muted); font-size: 0.85em; }
</style>
