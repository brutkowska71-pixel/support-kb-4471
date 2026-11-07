<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import filed from '#lib/data/problem-tickets.json';
  import { groupByProblem, mergedCount, mistagged, PROBLEM_TITLE, type Problem } from '#lib/kb/problems';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  let { ticket }: { ticket: number } = $props();

  const groups = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const total = $derived(mergedCount(groups));
  const problems = $derived(groups.filter((g) => g.problem !== 'unplaced').length);
  const wrongTag = $derived(mistagged(groups));
  const tickets = filed.tickets as Record<string, number>;
  const state = (filed.state ?? {}) as Record<string, string>;
  const link = (p: string) => (tickets[p] && filed.repo ? `https://github.com/${filed.repo}/issues/${tickets[p]}` : null);
  const title = (p: string) => PROBLEM_TITLE[p as Problem] ?? 'no tenant on file';
  const tags = (g: { taggedAs: Record<string, number> }) =>
    Object.entries(g.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{total}</strong> reports merged into #{ticket} ·
  <strong>{problems}</strong> {problems === 1 ? 'problem' : 'problems'} ·
  <strong>{wrongTag}</strong> tagged by intake as the wrong one
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const href = link(g.problem)}
      <tr>
        <td><code>{g.problem}</code><br /><span class="what">{title(g.problem)}</span></td>
        <td>{g.reports.length}{#if g.alsoUnder}<br /><span class="what">also in {g.alsoUnder}</span>{/if}</td>
        <td class="tags">{tags(g)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if href}<a {href}>#{tickets[g.problem]}</a>{#if state[g.problem]}<br /><span class="st {state[g.problem] === 'open' ? 'open' : ''}">{state[g.problem]}</span>{/if}{:else}<span class="none">none yet</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .what { color: var(--muted); font-size: 0.85em; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
  .st { color: var(--muted); font-size: 0.85em; }
  .st.open { color: var(--warn); font-weight: 600; }
</style>
