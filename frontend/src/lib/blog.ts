import fs from "node:fs";
import path from "node:path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  tool: string;
  intent: string;
  author: string;
  /** ISO publish date (YYYY-MM-DD) from frontmatter. */
  date: string;
  /** Raw markdown body (frontmatter stripped). */
  body: string;
  words: number;
}

export interface BlogFaq {
  q: string;
  a: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const data: Record<string, string> = {};
  if (!m) return { data, body: raw };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*"(.*)"\s*$/);
    if (kv) data[kv[1]] = kv[2];
  }
  return { data, body: m[2] };
}

function countWords(body: string): number {
  return body
    .replace(/[#>*`\[\]()/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md")).sort();
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const slug = data.slug || file.replace(/\.md$/, "");
    return {
      slug,
      title: data.title || slug,
      description: data.description || "",
      tool: data.tool || "/",
      intent: data.intent || "",
      author: data.author || "Downloadit Team",
      date: data.date || "",
      body,
      words: countWords(body),
    };
  });
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

/** Split the `## FAQ` section off the body. Returns article blocks + FAQs. */
export function splitFaq(body: string): { article: string; faqs: BlogFaq[] } {
  const idx = body.search(/^## FAQ\s*$/m);
  if (idx === -1) return { article: body, faqs: [] };
  const article = body.slice(0, idx).trim();
  const faqBody = body.slice(idx).replace(/^## FAQ\s*/, "").trim();
  const faqs: BlogFaq[] = [];
  // Questions are full-line **bold** entries; everything until the next
  // question (or end) is the answer.
  const parts = faqBody.split(/^\*\*(.+?)\*\*\s*$/m);
  // parts[0] is text before the first question (usually empty)
  for (let i = 1; i < parts.length; i += 2) {
    const q = (parts[i] || "").trim();
    const a = (parts[i + 1] || "").replace(/\s+/g, " ").trim();
    if (q && a) faqs.push({ q, a });
  }
  return { article, faqs };
}
