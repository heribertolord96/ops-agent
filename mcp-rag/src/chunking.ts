const MAX_CHUNK_CHARS = 1800;

/**
 * Split Markdown into chunks by headings / blank-line sections.
 * Oversized sections are split further on paragraphs.
 */
export function chunkMarkdown(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections = splitByHeadings(normalized);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.length <= MAX_CHUNK_CHARS) {
      chunks.push(trimmed);
      continue;
    }

    for (const part of splitOversized(trimmed)) {
      if (part.trim()) chunks.push(part.trim());
    }
  }

  return chunks;
}

function splitByHeadings(text: string): string[] {
  const lines = text.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s+\S/.test(line) && current.length > 0) {
      sections.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n"));

  // Also split large heading-free blocks on double newlines
  const refined: string[] = [];
  for (const section of sections) {
    if (section.includes("\n\n") && !/^#{1,6}\s/m.test(section.slice(0, 80))) {
      refined.push(...section.split(/\n{2,}/));
    } else {
      refined.push(section);
    }
  }
  return refined;
}

function splitOversized(text: string): string[] {
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let buf = "";

  for (const para of paras) {
    const candidate = buf ? `${buf}\n\n${para}` : para;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      buf = candidate;
      continue;
    }
    if (buf) out.push(buf);
    if (para.length <= MAX_CHUNK_CHARS) {
      buf = para;
    } else {
      for (let i = 0; i < para.length; i += MAX_CHUNK_CHARS) {
        out.push(para.slice(i, i + MAX_CHUNK_CHARS));
      }
      buf = "";
    }
  }
  if (buf) out.push(buf);
  return out;
}
