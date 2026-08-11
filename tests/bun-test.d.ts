declare module "bun:test" {
  export function describe(name: string, run: () => void): void;

  type TestRunner = (name: string, run: () => void | Promise<void>) => void;

  /**
   * `test.each` is typed with two overloads so both shapes bun accepts work:
   * an array of tuples spreads into multiple parameters, while an array of
   * scalars passes a single parameter.
   */
  export const test: TestRunner & {
    each<T extends readonly unknown[]>(
      cases: readonly T[],
    ): (name: string, run: (...args: T) => void | Promise<void>) => void;
    each<T>(
      cases: readonly T[],
    ): (name: string, run: (arg: T) => void | Promise<void>) => void;
    skip: TestRunner;
    only: TestRunner;
  };

  type Matchers<T> = {
    toEqual(expected: unknown): void;
    toBe(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toMatch(expected: string | RegExp): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
    toThrow(expected?: string | RegExp): void;
    not: Matchers<T>;
  };

  export function expect<T>(actual: T): Matchers<T>;
}
