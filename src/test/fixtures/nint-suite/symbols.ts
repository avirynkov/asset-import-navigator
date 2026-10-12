/** Non-interference fixture — ordinary TS symbols only (no asset imports). */

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export interface Point {
  x: number;
  y: number;
}

export const origin: Point = { x: 0, y: 0 };

export type Label = string;

export type Tagged = { tag: string };

export function wrap(tag: string): Tagged {
  return { tag };
}

export function identity<T>(value: T): T {
  return value;
}

export const COLORS = {
  red: '#f00',
  green: '#0f0',
  blue: '#00f',
} as const;

export class Counter {
  private value = 0;
  increment(): number {
    this.value += 1;
    return this.value;
  }
}

export function createCounter(): Counter {
  return new Counter();
}

export function format(n: number): string {
  return String(n);
}

export function parse(s: string): number {
  return Number(s);
}

export namespace UtilNs {
  export function helper(): boolean {
    return true;
  }
}

export const EXTERNAL_CONST = 99;

export interface ReactLike {
  props: { children?: unknown };
}

export function usePoint(p: Point): number {
  return p.x + p.y;
}

export enum Kind {
  A,
  B,
  C,
}

export type Result = { ok: true; data: number } | { ok: false; error: string };

export function ok(data: number): Result {
  return { ok: true, data };
}
