const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Splits text into Discord-safe chunks while preserving sentence/paragraph boundaries
 */
export function chunkMessage(text: string, maxLength: number = DISCORD_MESSAGE_LIMIT): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitAt = maxLength;

    // Priority: sentence end > newline > space > hard cut
    // Try to find sentence boundary (. ! ?)
    const sentenceEnd = findLastSentenceEnd(remaining, maxLength);
    if (sentenceEnd > maxLength * 0.5) {
      splitAt = sentenceEnd;
    } else {
      // Try newline
      const newline = remaining.lastIndexOf('\n', maxLength);
      if (newline > maxLength * 0.3) {
        splitAt = newline + 1;
      } else {
        // Try word boundary
        const space = remaining.lastIndexOf(' ', maxLength);
        if (space > maxLength * 0.3) {
          splitAt = space + 1;
        }
      }
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Find the last sentence ending before maxLength
 */
function findLastSentenceEnd(text: string, maxLength: number): number {
  const searchText = text.slice(0, maxLength);
  
  // Look for sentence endings followed by space or newline
  const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  let lastEnd = -1;

  for (const ending of sentenceEndings) {
    const index = searchText.lastIndexOf(ending);
    if (index > lastEnd) {
      lastEnd = index + ending.length;
    }
  }

  return lastEnd;
}

/**
 * Wraps text in a code block, handling the 2000 char limit
 */
export function wrapInCodeBlock(text: string, language: string = ''): string[] {
  const codeBlockOverhead = 6 + language.length + 2; // ``` + lang + \n + \n + ```
  const maxContentLength = DISCORD_MESSAGE_LIMIT - codeBlockOverhead;

  const chunks = chunkMessage(text, maxContentLength);
  
  return chunks.map((chunk) => `\`\`\`${language}\n${chunk}\n\`\`\``);
}
