import { describe, expect, it } from "vitest";
import { emergencyDialNumbers } from "../emergencyNumbers";
import countries from "../../data/emergencyNumbersByCountry";

describe("emergency dial targets", () => {
  it.each([
    ["112 or 17", ["112", "17"]],
    ["112/116", ["112", "116"]],
    ["194 and 195", ["194", "195"]],
    ["000", ["000"]],
    ["018 527 100", ["018527100"]],
    ["depends on town/city", []],
    ["McMurdo Station : 911 (fire and medical emergency dispatch)", []],
    ["199 , Coast Guard – 994", []],
    ["—", []],
  ])("parses %s without concatenating alternatives", (value, expected) => {
    expect(emergencyDialNumbers(value)).toEqual(expected);
  });

  it.each([
    ["United Kingdom", "999"], ["Australia", "000"], ["Germany", "110"],
    ["Norway", "112"], ["Denmark", "112"], ["Sweden", "112"],
    ["Netherlands", "112"], ["Italy", "112"], ["Czech Republic", "112"],
  ])("uses emergency police dispatch for %s", (country, number) => {
    expect(countries.find((entry) => entry.country === country).police).toBe(number);
  });
});
