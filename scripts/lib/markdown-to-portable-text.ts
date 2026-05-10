/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Markdown → Sanity Portable Text Converter
 * ──────────────────────────────────────────────────────────────────────────────
 * Converts a markdown string (from the LLM) into Sanity's Portable Text
 * block array format. This avoids the complexity of teaching the LLM
 * Sanity's internal JSON structure — the LLM just writes markdown.
 *
 * Supports: headings (h2-h4), paragraphs, bold, italic, links, lists,
 * blockquotes, and inline code.
 */

import { randomUUID } from 'crypto';

type BlockStyle = 'normal' | 'h2' | 'h3' | 'h4' | 'blockquote';

interface Span {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
}

interface MarkDef {
  _type: string;
  _key: string;
  href?: string;
}

interface Block {
  _type: 'block';
  _key: string;
  style: BlockStyle;
  children: Span[];
  markDefs: MarkDef[];
  listItem?: 'bullet' | 'number';
  level?: number;
}

function key(): string {
  return randomUUID().slice(0, 8);
}

/**
 * Parses inline markdown formatting (bold, italic, links, code)
 * and returns Portable Text spans + markDefs.
 */
function parseInlineMarks(text: string): { spans: Span[]; markDefs: MarkDef[] } {
  const spans: Span[] = [];
  const markDefs: MarkDef[] = [];

  // Regex to match: **bold**, *italic*, `code`, [text](url)
  const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) {
        spans.push({ _type: 'span', _key: key(), text: plain, marks: [] });
      }
    }

    if (match[2]) {
      // **bold**
      spans.push({ _type: 'span', _key: key(), text: match[2], marks: ['strong'] });
    } else if (match[3]) {
      // *italic*
      spans.push({ _type: 'span', _key: key(), text: match[3], marks: ['em'] });
    } else if (match[4]) {
      // `code`
      spans.push({ _type: 'span', _key: key(), text: match[4], marks: ['code'] });
    } else if (match[5] && match[6]) {
      // [text](url)
      const linkKey = key();
      markDefs.push({ _type: 'link', _key: linkKey, href: match[6] });
      spans.push({ _type: 'span', _key: key(), text: match[5], marks: [linkKey] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) {
      spans.push({ _type: 'span', _key: key(), text: remaining, marks: [] });
    }
  }

  // If no matches were found, the entire text is a plain span
  if (spans.length === 0) {
    spans.push({ _type: 'span', _key: key(), text, marks: [] });
  }

  return { spans, markDefs };
}

/**
 * Converts a full markdown string to a Sanity Portable Text block array.
 */
export function markdownToPortableText(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') continue;

    // ── External Image ───────────────────────────────────────
    const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({
        _type: 'externalImage',
        _key: key(),
        alt: imgMatch[1] || '',
        url: imgMatch[2] || '',
      } as any);
      continue;
    }

    let style: BlockStyle = 'normal';
    let content = line;
    let listItem: 'bullet' | 'number' | undefined;

    // ── Headings ──────────────────────────────────────────────
    if (line.startsWith('#### ')) {
      style = 'h4';
      content = line.slice(5);
    } else if (line.startsWith('### ')) {
      style = 'h3';
      content = line.slice(4);
    } else if (line.startsWith('## ')) {
      style = 'h2';
      content = line.slice(3);
    }
    // ── Blockquote ───────────────────────────────────────────
    else if (line.startsWith('> ')) {
      style = 'blockquote';
      content = line.slice(2);
    }
    // ── Unordered list ───────────────────────────────────────
    else if (/^[-*]\s+/.test(line)) {
      listItem = 'bullet';
      content = line.replace(/^[-*]\s+/, '');
    }
    // ── Ordered list ─────────────────────────────────────────
    else if (/^\d+\.\s+/.test(line)) {
      listItem = 'number';
      content = line.replace(/^\d+\.\s+/, '');
    }

    const { spans, markDefs } = parseInlineMarks(content.trim());

    const block: Block = {
      _type: 'block',
      _key: key(),
      style,
      children: spans,
      markDefs,
    };

    if (listItem) {
      block.listItem = listItem;
      block.level = 1;
    }

    blocks.push(block);
  }

  return blocks;
}
