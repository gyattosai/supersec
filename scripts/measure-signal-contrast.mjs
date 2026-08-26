const pairs = [
  ["dark primary / primary foreground", "#bd4700", "#fffaf7"],
  ["dark foreground / background", "#fff7f2", "#100b08"],
  ["dark muted foreground / card", "#c6a99a", "#1a1210"],
  ["dark focus ring / background", "#ff9b69", "#100b08"],
  ["dark input border / card", "#87604d", "#1a1210"],
  ["light primary / primary foreground", "#b84300", "#fffaf7"],
  ["light foreground / background", "#26130b", "#fff8f4"],
  ["light muted foreground / card", "#76574a", "#ffffff"],
  ["light focus ring / background", "#e15c16", "#fff8f4"],
  ["light input border / card", "#a96242", "#ffffff"],
];

function linearChannel(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const values = hex.slice(1).match(/.{2}/g).map(value => Number.parseInt(value, 16));
  return 0.2126 * linearChannel(values[0]) + 0.7152 * linearChannel(values[1]) + 0.0722 * linearChannel(values[2]);
}

for (const [label, first, second] of pairs) {
  const ratio = (Math.max(luminance(first), luminance(second)) + 0.05) / (Math.min(luminance(first), luminance(second)) + 0.05);
  console.log(`${label}: ${ratio.toFixed(2)}:1`);
}
