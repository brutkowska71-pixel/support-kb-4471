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

export function problemOf(r: Report, t: Tenant | undefined, shiftIds: readonly string[]): Problem | null {
  if (shiftIds.includes(r.id)) return 'shift';
  return causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

// One row per problem among the reports merged into `ticket`. Export pages overlap: one id, one report.
export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), shiftIds) ?? 'unplaced';
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// Reports whose intake tag names a different problem than the one they belong to.
export function mistagged(groups: ProblemGroup[]): number {
  return groups.reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}
