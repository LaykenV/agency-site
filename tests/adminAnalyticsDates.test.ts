import { describe, expect, test } from "bun:test";
import { getAdminAnalyticsDateWindow } from "../convex/lib/adminAnalyticsDates";

describe("getAdminAnalyticsDateWindow", () => {
  test("uses a 30-date inclusive window and prior month-to-date comparison", () => {
    const window = getAdminAnalyticsDateWindow(
      new Date("2026-08-05T12:00:00.000Z"),
    );

    expect(window).toEqual({
      today: "2026-08-05",
      thisMonth: "2026-08",
      lastMonth: "2026-07",
      lastMonthComparableEnd: "2026-07-05",
      start30Str: "2026-07-07",
      queryStart: "2026-07-01",
    });
  });

  test("keeps the rolling window when it reaches before last month", () => {
    const window = getAdminAnalyticsDateWindow(
      new Date("2026-03-01T00:00:00.000Z"),
    );

    expect(window.start30Str).toBe("2026-01-31");
    expect(window.queryStart).toBe("2026-01-31");
    expect(window.lastMonthComparableEnd).toBe("2026-02-01");
  });

  test("caps comparison at the final day of a shorter prior month", () => {
    const window = getAdminAnalyticsDateWindow(
      new Date("2026-03-31T23:59:59.000Z"),
    );

    expect(window.lastMonthComparableEnd).toBe("2026-02-28");
  });
});
