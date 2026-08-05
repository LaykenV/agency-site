declare module "bun:test" {
  export function describe(name: string, run: () => void): void;
  export function test(
    name: string,
    run: () => void | Promise<void>,
  ): void;

  type Matchers<T> = {
    toEqual(expected: unknown): void;
    toBe(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toMatch(expected: string | RegExp): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toContain(expected: unknown): void;
    not: Matchers<T>;
  };

  export function expect<T>(actual: T): Matchers<T>;
}
