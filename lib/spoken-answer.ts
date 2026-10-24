import { normalize } from "./scoring";
const words: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
function spokenNumber(value: string) {
  if (/^\s*-/.test(value)) return null;
  const clean = value
    .toLowerCase()
    .replace(/[.,!?]$/, "")
    .replace(/ degrees?$/, "")
    .replaceAll("-", " ")
    .trim();
  if (/^[+]?[0-9]+$/.test(clean)) return Number(clean);
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const small = Object.entries(words)
    .filter(([, n]) => n < 20)
    .map(([word]) => word);
  const say = (n: number): string =>
    n < 20
      ? small[n]
      : n < 100
        ? tens[Math.floor(n / 10)] + (n % 10 ? " " + small[n % 10] : "")
        : small[Math.floor(n / 100)] +
          " hundred" +
          (n % 100 ? " " + say(n % 100) : "");
  const canonical = clean.replace(/ hundred and /, " hundred ");
  for (let n = 0; n < 1000; n++) if (say(n) === canonical) return n;
  return null;
}
export function isSpokenCorrect(value: string, accepted: string[]) {
  const clean = value.trim().replace(/[.,!?]+$/, "");
  return accepted.some((answer) => {
    if (/^\d+\s*\/\s*\d+$/.test(answer)) {
      const fraction = clean.match(/^(\d+)\s*(?:\/|over)\s*(\d+)$/i);
      if (!fraction || Number(fraction[2]) === 0) return false;
      const [top, bottom] = answer.split("/").map(Number);
      return Number(fraction[1]) * bottom === top * Number(fraction[2]);
    }
    if (/^[0-9]+$/.test(answer)) return spokenNumber(clean) === Number(answer);
    const key = (v: string) => normalize(v).replace(/^the /, "");
    return key(clean) === key(answer);
  });
}
