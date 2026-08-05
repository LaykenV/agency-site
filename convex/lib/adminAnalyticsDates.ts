export function getAdminAnalyticsDateWindow(now: Date) {
  const today = now.toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const lastMonthDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  const lastMonthStart = `${lastMonth}-01`;
  const daysInLastMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0),
  ).getUTCDate();
  const comparableDay = Math.min(now.getUTCDate(), daysInLastMonth);
  const lastMonthComparableEnd = new Date(
    Date.UTC(
      lastMonthDate.getUTCFullYear(),
      lastMonthDate.getUTCMonth(),
      comparableDay,
    ),
  )
    .toISOString()
    .slice(0, 10);
  const start30 = new Date(now);
  start30.setUTCDate(start30.getUTCDate() - 29);
  const start30Str = start30.toISOString().slice(0, 10);
  const queryStart = start30Str < lastMonthStart ? start30Str : lastMonthStart;

  return {
    today,
    thisMonth,
    lastMonth,
    lastMonthComparableEnd,
    start30Str,
    queryStart,
  };
}
