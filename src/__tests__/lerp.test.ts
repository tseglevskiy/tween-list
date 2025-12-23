import { describe, it, expect } from 'vitest';
import { lerp } from '../utils/lerp';

describe('lerp', () => {
  it('should return start value when t is 0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(5, 15, 0)).toBe(5);
    expect(lerp(-10, 10, 0)).toBe(-10);
  });

  it('should return end value when t is 1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(5, 15, 1)).toBe(15);
    expect(lerp(-10, 10, 1)).toBe(10);
  });

  it('should interpolate correctly at midpoint', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });

  it('should interpolate correctly at arbitrary points', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerp(0, 10, 0.75)).toBe(7.5);
    expect(lerp(10, 20, 0.3)).toBe(13);
  });

  it('should work with negative ranges', () => {
    expect(lerp(-20, -10, 0.5)).toBe(-15);
    expect(lerp(-10, 0, 0.5)).toBe(-5);
  });

  it('should work with reversed ranges', () => {
    expect(lerp(10, 0, 0.5)).toBe(5);
    expect(lerp(20, 10, 0.3)).toBe(17);
  });

  it('should handle floating point values', () => {
    expect(lerp(1.5, 2.5, 0.5)).toBe(2);
    expect(lerp(0.1, 0.9, 0.5)).toBeCloseTo(0.5);
  });
});
