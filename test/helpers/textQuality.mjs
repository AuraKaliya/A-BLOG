export const mojibakePattern =
  /\uFFFD|(?:Ã.|Â.|â[€™€œ€“€”])|(?:鐨|鍏|鏂|绔|鏃|鏇|鏈|鎼|杈|姝|瀹|娴|绛|鈥|鈫|銆|锛|闅|栧|湪|噺|枃|灏|潰|棣|鑽|緩|妗)/;

export function hasTextQualityIssue(value) {
  return mojibakePattern.test(String(value ?? ""));
}

export function describeTextQualityIssue(value) {
  const text = String(value ?? "");
  const match = text.match(mojibakePattern);
  return match ? match[0] : "";
}
