// #4471 split by problem. causes.ts says which bug a flipped date comes from; this file adds the
// reports that are not a flipped date at all. Pages explain it; this file is what runs.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// `parser` and `hint` flip day and month (causes.ts). `shift` is a different symptom: the date
// moves by one day, or differs by the reader's time zone. The desk lists those reports by id
// (desk-notes.json, `oneDayMove`) because their bodies, not their tenant, say what they are.
export type Problem = Cause | 'shift';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'shift'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  parser: 'Shared parser reads day-first dates month first',
  hint: 'booking-v3 form hint says MM/DD to day-first tenants',
  shift: 'Dates move by one day across time zones',
};

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // For `shift`: the cause the desk also files these reports under, by tenant.
  alsoUnder?: Cause;
};

function summarize(problem: ProblemGroup['problem'], rs: Report[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

// One row per problem among the reports merged into `ticket`, counted the desk's way: every report
// sits under its cause by tenant (causes.ts), as CauseTable files it. The one-day moves the desk
// listed (desk-notes.json) stay counted under that cause and also get a row of their own.
// Export pages overlap: one id, one report.
export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = causeOf(r, tenantOf(r)) ?? 'unplaced';
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()].map(([p, rs]) => summarize(p, rs)).sort((a, b) => b.reports.length - a.reports.length);
  const moved = merged.filter((r) => shiftIds.includes(r.id));
  if (moved.length) {
    const under = [...new Set(moved.map((r) => causeOf(r, tenantOf(r))))];
    groups.push({ ...summarize('shift', moved), alsoUnder: under.length === 1 && under[0] ? under[0] : undefined });
  }
  return groups;
}

// Merged reports, each counted once (the shift row repeats reports already under a cause).
export function mergedCount(groups: ProblemGroup[]): number {
  return groups.filter((g) => g.problem !== 'shift').reduce((n, g) => n + g.reports.length, 0);
}

// Reports whose intake tag names a different cause than the one they are filed under.
export function mistagged(groups: ProblemGroup[]): number {
  return groups
    .filter((g) => g.problem !== 'shift')
    .reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}
