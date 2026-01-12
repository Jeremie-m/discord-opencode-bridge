/**
 * Smart message chunking for Discord
 * - Respects 2000 char limit
 * - Doesn't split mid-sentence
 * - Preserves code blocks
 * - Handles markdown properly
 */

const DISCORD_MESSAGE_LIMIT = 2000;
const SAFE_LIMIT = 1950; // Leave some margin for safety

/**
 * Splits text into Discord-safe chunks while preserving sentence/paragraph boundaries
 */
export function chunkMessage(text: string, maxLength: number = SAFE_LIMIT): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  // If text contains code blocks, use special handling
  if (text.includes('```')) {
    return chunkWithCodeBlocks(text, maxLength);
  }

  return chunkPlainText(text, maxLength);
}

/**
 * Chunk plain text at sentence/paragraph boundaries
 */
function chunkPlainText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining.trim());
      break;
    }

    const splitAt = findBestSplitPoint(remaining, maxLength);
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Find the best point to split text
 * Priority: paragraph > sentence > line > word > hard cut
 */
function findBestSplitPoint(text: string, maxLength: number): number {
  const searchText = text.slice(0, maxLength);

  // Try paragraph break (double newline)
  const paragraphBreak = searchText.lastIndexOf('\n\n');
  if (paragraphBreak > maxLength * 0.3) {
    return paragraphBreak + 2;
  }

  // Try sentence ending (. ! ? followed by space or newline)
  const sentenceEnd = findLastSentenceEnd(searchText);
  if (sentenceEnd > maxLength * 0.4) {
    return sentenceEnd;
  }

  // Try single newline
  const newline = searchText.lastIndexOf('\n');
  if (newline > maxLength * 0.3) {
    return newline + 1;
  }

  // Try word boundary
  const space = searchText.lastIndexOf(' ');
  if (space > maxLength * 0.3) {
    return space + 1;
  }

  // Hard cut (shouldn't normally reach here)
  return maxLength;
}

/**
 * Find the last sentence ending in text
 */
function findLastSentenceEnd(text: string): number {
  // Look for sentence endings followed by space, newline, or end of string
  const sentenceEndings = [
    { pattern: '. ', offset: 2 },
    { pattern: '! ', offset: 2 },
    { pattern: '? ', offset: 2 },
    { pattern: '.\n', offset: 2 },
    { pattern: '!\n', offset: 2 },
    { pattern: '?\n', offset: 2 },
    { pattern: '.`', offset: 2 }, // End of inline code
    { pattern: '."', offset: 2 }, // End of quote
  ];

  let lastEnd = -1;

  for (const { pattern, offset } of sentenceEndings) {
    const index = text.lastIndexOf(pattern);
    if (index > lastEnd) {
      lastEnd = index + offset;
    }
  }

  return lastEnd;
}

/**
 * Chunk text that contains code blocks
 * Tries to keep code blocks intact
 */
function chunkWithCodeBlocks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const segments = splitByCodeBlocks(text);

  let currentChunk = '';

  for (const segment of segments) {
    // If segment alone is too long, split it
    if (segment.length > maxLength) {
      // Flush current chunk first
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Check if it's a code block
      if (segment.startsWith('```')) {
        // Split code block
        chunks.push(...splitLongCodeBlock(segment, maxLength));
      } else {
        // Split plain text
        chunks.push(...chunkPlainText(segment, maxLength));
      }
      continue;
    }

    // Check if adding segment would exceed limit
    if (currentChunk.length + segment.length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = segment;
    } else {
      currentChunk += segment;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Split text into segments of code blocks and regular text
 */
function splitByCodeBlocks(text: string): string[] {
  const segments: string[] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    // Add code block
    segments.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

/**
 * Split a long code block into multiple code blocks
 */
function splitLongCodeBlock(codeBlock: string, maxLength: number): string[] {
  // Extract language and content
  const match = codeBlock.match(/^```(\w*)\n?([\s\S]*?)```$/);
  if (!match) {
    // Malformed code block, treat as plain text
    return chunkPlainText(codeBlock, maxLength);
  }

  const language = match[1] || '';
  const content = match[2];

  // Calculate overhead for code block wrapper
  const overhead = 6 + language.length + 2; // ```lang\n + \n```
  const contentMaxLength = maxLength - overhead;

  // Split content by lines
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentContent = '';

  for (const line of lines) {
    // Check if single line is too long
    if (line.length > contentMaxLength) {
      // Flush current content
      if (currentContent) {
        chunks.push(wrapCodeBlock(currentContent, language));
        currentContent = '';
      }
      // Split long line
      const wrappedLines = wrapLongLine(line, contentMaxLength);
      for (const wrappedLine of wrappedLines) {
        chunks.push(wrapCodeBlock(wrappedLine, language));
      }
      continue;
    }

    // Check if adding line would exceed limit
    const newLength = currentContent.length + line.length + 1; // +1 for newline
    if (newLength > contentMaxLength) {
      chunks.push(wrapCodeBlock(currentContent, language));
      currentContent = line;
    } else {
      currentContent += (currentContent ? '\n' : '') + line;
    }
  }

  // Don't forget the last chunk
  if (currentContent) {
    chunks.push(wrapCodeBlock(currentContent, language));
  }

  return chunks;
}

/**
 * Wrap content in a code block
 */
function wrapCodeBlock(content: string, language: string = ''): string {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

/**
 * Wrap a long line into multiple lines
 */
function wrapLongLine(line: string, maxLength: number): string[] {
  const parts: string[] = [];
  let remaining = line;

  while (remaining.length > maxLength) {
    // Try to split at a space
    let splitAt = remaining.lastIndexOf(' ', maxLength);
    if (splitAt <= 0) {
      splitAt = maxLength;
    }
    parts.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

/**
 * Wraps text in a code block, handling the 2000 char limit
 */
export function wrapInCodeBlock(text: string, language: string = ''): string[] {
  const codeBlockOverhead = 6 + language.length + 2; // ``` + lang + \n + \n + ```
  const maxContentLength = SAFE_LIMIT - codeBlockOverhead;

  // If text fits in one block, return it
  if (text.length <= maxContentLength) {
    return [wrapCodeBlock(text, language)];
  }

  // Split and wrap each chunk
  return splitLongCodeBlock(wrapCodeBlock(text, language), SAFE_LIMIT);
}

/**
 * Strip ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1B\[[0-9;]*[a-zA-Z]/g;
  return text.replace(ansiRegex, '');
}

/**
 * Format a code response for Discord
 */
export function formatCodeResponse(code: string, language: string = ''): string[] {
  const cleaned = stripAnsi(code);
  return wrapInCodeBlock(cleaned, language);
}
