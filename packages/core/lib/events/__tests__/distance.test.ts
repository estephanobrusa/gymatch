import { describe, it, expect } from "vitest";
import { haversineKm, isNearGym } from "../distance";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    const point = { lat: -34.6037, lng: -58.3816 };
    expect(haversineKm(point, point)).toBe(0);
  });

  it("measures Buenos Aires → Rosario at roughly 280 km", () => {
    const buenosAires = { lat: -34.6037, lng: -58.3816 };
    const rosario = { lat: -32.9468, lng: -60.6393 };
    expect(haversineKm(buenosAires, rosario)).toBeGreaterThan(260);
    expect(haversineKm(buenosAires, rosario)).toBeLessThan(310);
  });

  it("is symmetric", () => {
    const a = { lat: -34.6037, lng: -58.3816 };
    const b = { lat: -32.9468, lng: -60.6393 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe("isNearGym", () => {
  it("returns true when the event gym is close", () => {
    const userGym = { lat: -34.6037, lng: -58.3816 };
    const event = { gym: { lat: -34.62, lng: -58.4 } };
    expect(isNearGym(event, userGym, 25)).toBe(true);
  });

  it("returns false when the event gym is far away", () => {
    const userGym = { lat: -34.6037, lng: -58.3816 };
    const event = { gym: { lat: -32.9468, lng: -60.6393 } };
    expect(isNearGym(event, userGym, 25)).toBe(false);
  });

  it("returns false when the event has no gym", () => {
    const userGym = { lat: -34.6037, lng: -58.3816 };
    expect(isNearGym({ gym: null }, userGym, 25)).toBe(false);
  });

  it("returns false when either side lacks coordinates", () => {
    const noCoords = { lat: null, lng: null };
    const event = { gym: { lat: -34.62, lng: -58.4 } };
    expect(isNearGym(event, noCoords, 25)).toBe(false);
    expect(isNearGym(event, null, 25)).toBe(false);
  });

  it("uses the provided max distance as the threshold", () => {
    const userGym = { lat: -34.6037, lng: -58.3816 };
    const event = { gym: { lat: -33.3, lng: -58.6 } };
    // ~150 km: within 200, outside 100
    expect(isNearGym(event, userGym, 200)).toBe(true);
    expect(isNearGym(event, userGym, 100)).toBe(false);
  });
});
