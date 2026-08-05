declare module "bun:test" {
  export function describe(name: string, run: () => void): void;
  export function test(
    name: string,
    run: () => void | Promise<void>,
  ): void;
  export function expect<T>(actual: T): {
    toEqual(expected: unknown): void;
  };
}
