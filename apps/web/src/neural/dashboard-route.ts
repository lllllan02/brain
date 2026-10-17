export type DashboardView = 'overview' | 'activity';

export function dashboardRoute(hash: string): DashboardView | null {
  if (/^#\/dashboard\/?$/.test(hash)) return 'overview';
  if (/^#\/dashboard\/activity\/?$/.test(hash)) return 'activity';
  return null;
}
export const dashboardHref = (view: DashboardView) =>
  view === 'overview' ? '#/dashboard' : '#/dashboard/activity';
