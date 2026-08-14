export function toSpeechText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu, " ")
    .replace(/[\p{Emoji_Modifier}\p{Regional_Indicator}\u20E3]/gu, " ")
    .replace(/\u200D|\uFE0E|\uFE0F/g, "")
    .replace(/^[\s>*#`~_-]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
