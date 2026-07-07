import { describe, it, expect } from "vitest";
import { amountToWords, integerToWords, splitAmount } from "./amountToWords";

describe("integerToWords", () => {
  it("handles small numbers", () => {
    expect(integerToWords(0)).toBe("ZERO");
    expect(integerToWords(7)).toBe("SEVEN");
    expect(integerToWords(15)).toBe("FIFTEEN");
    expect(integerToWords(20)).toBe("TWENTY");
    expect(integerToWords(34)).toBe("THIRTY FOUR");
    expect(integerToWords(99)).toBe("NINETY NINE");
  });

  it("handles hundreds and thousands", () => {
    expect(integerToWords(100)).toBe("ONE HUNDRED");
    expect(integerToWords(234)).toBe("TWO HUNDRED THIRTY FOUR");
    expect(integerToWords(1000)).toBe("ONE THOUSAND");
    expect(integerToWords(1234)).toBe("ONE THOUSAND TWO HUNDRED THIRTY FOUR");
    expect(integerToWords(1000000)).toBe("ONE MILLION");
    expect(integerToWords(1250375)).toBe(
      "ONE MILLION TWO HUNDRED FIFTY THOUSAND THREE HUNDRED SEVENTY FIVE",
    );
  });
});

describe("splitAmount", () => {
  it("avoids floating point drift", () => {
    expect(splitAmount(1234.5)).toEqual({ whole: 1234, cents: 50 });
    expect(splitAmount(0.1 + 0.2)).toEqual({ whole: 0, cents: 30 });
    expect(splitAmount(19.99)).toEqual({ whole: 19, cents: 99 });
  });
});

describe("amountToWords (Philippine peso style)", () => {
  it("whole pesos with centavos", () => {
    expect(amountToWords(1234.5)).toBe(
      "ONE THOUSAND TWO HUNDRED THIRTY FOUR PESOS AND 50/100 ONLY",
    );
  });

  it("exact whole amount has no fraction", () => {
    expect(amountToWords(100)).toBe("ONE HUNDRED PESOS ONLY");
  });

  it("singular peso", () => {
    expect(amountToWords(1)).toBe("ONE PESO ONLY");
  });

  it("sub-peso amounts spell out centavos", () => {
    expect(amountToWords(0.75)).toBe("SEVENTY FIVE CENTAVOS ONLY");
    expect(amountToWords(0.01)).toBe("ONE CENTAVO ONLY");
  });

  it("zero", () => {
    expect(amountToWords(0)).toBe("ZERO PESOS ONLY");
  });

  it("large amount", () => {
    expect(amountToWords(1250375.25)).toBe(
      "ONE MILLION TWO HUNDRED FIFTY THOUSAND THREE HUNDRED SEVENTY FIVE PESOS AND 25/100 ONLY",
    );
  });

  it("can omit the ONLY terminator", () => {
    expect(amountToWords(50, { appendOnly: false })).toBe("FIFTY PESOS");
  });
});
