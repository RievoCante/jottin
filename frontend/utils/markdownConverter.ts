// Utilities for converting between Note objects and Markdown files with frontmatter
import matter from 'gray-matter';
import { Note } from '../types';

export function noteToMarkdown(note: Note): string {
  // Manually construct YAML frontmatter (browser-compatible, no Buffer needed)
  const frontmatterLines = [
    '---',
    `title: ${escapeYamlValue(note.title)}`,
    `date: ${note.date}`,
    `collection: ${note.collectionId || ''}`,
    `pinned: ${note.isPinned || false}`,
    `id: ${note.id}`,
    `encrypted: false`,
    '---',
  ];

  return frontmatterLines.join('\n') + '\n\n' + note.content;
}

function escapeYamlValue(value: string): string {
  // If value contains special chars, wrap in quotes and escape quotes
  if (
    value.includes(':') ||
    value.includes('#') ||
    value.includes('\n') ||
    value.includes('"')
  ) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function markdownToNote(filename: string, markdown: string): Note {
  let data: any = {};
  let content = markdown;

  try {
    const parsed = matter(markdown);
    data = parsed.data;
    content = parsed.content;
  } catch (error) {
    // If parsing fails, treat entire content as markdown without frontmatter
    console.log(`No frontmatter found in ${filename}, using full content`);
    content = markdown;
  }

  // Extract ID from frontmatter or generate from filename
  const cleanFilename = filename.replace('.md', '');
  const id = data.id || `imported-${cleanFilename}-${Date.now()}`;

  // Get title: from frontmatter, or first line of content, or filename
  let title = data.title || cleanFilename;
  if (!data.title && content) {
    const firstLine = content.split('\n')[0].trim();
    // If first line starts with #, use it as title (removing the #)
    if (firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '');
    }
  }

  return {
    id,
    title,
    content: content.trim(),
    date: data.date || new Date().toISOString(),
    collectionId: data.collection || undefined,
    isPinned: data.pinned || false,
  };
}

export function sanitizeFilename(title: string): string {
  // Remove invalid filename characters and limit length
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

export function getFilenameForNote(note: Note): string {
  const sanitized = sanitizeFilename(note.title);
  return `${sanitized}.md`;
}
