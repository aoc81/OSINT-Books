export const DEFAULT_SOURCE_REPO_URL = "https://github.com/aoc81/OSINT-Books";

export function createCatalogSource(overrides = {}) {
  return {
    meta: {
      title: "OSINT Books",
      repoUrl: DEFAULT_SOURCE_REPO_URL,
      generatedReadmeNotice: "This README is generated from catalog/catalog.json via scripts/render-readme.mjs.",
      intro: [
        "In this repository, you will find a short list of books on various OSINT tools and techniques, the use of OSINT in different fields (cybersecurity, recruiting), and the psychological aspects of investigations.",
        "We tried to select books from the 2020s, but there are a few older books that contain little technical information that quickly becomes outdated."
      ],
      otherListsHeading: "Other lists of OSINT books",
      otherLists: [
        { label: "OSINT Books list from HelpSecurity", url: "https://www.helpnetsecurity.com/2025/02/17/osint-books/" },
        { label: "Top 5 OSINT Books from Social Links", url: "https://blog.sociallinks.io/top-5-books-for-sharpening-your-osint-skills-in-2025/" },
        { label: "OSINT Books Goodreads Rating", url: "https://www.goodreads.com/shelf/show/osint" },
        { label: "OSINT Books List from Aware Online", url: "https://www.aware-online.com/en/osint-books/" }
      ]
    },
    sections: [
      { slug: "osint-books", title: "OSINT Books" },
      { slug: "german-osint-books", title: "German OSINT books" },
      { slug: "investigative-journalism-books", title: "Investigative Journalism Books" }
    ],
    books: [],
    ...overrides
  };
}

export function normalizeCatalogSource(payload = {}) {
  const catalog = createCatalogSource({
    meta: { ...createCatalogSource().meta, ...(payload.meta ?? {}) },
    sections: normalizeSections(payload.sections),
    books: []
  });

  catalog.books = sortBooks((payload.books ?? []).map((entry) => normalizeBookRecord(entry)), catalog.sections);
  return catalog;
}

export function normalizeBookRecord(entry = {}) {
  const title = String(entry.title ?? "").trim();
  const section = String(entry.section ?? "OSINT Books").trim() || "OSINT Books";
  const yearLabel = normalizeYearLabel(entry.yearLabel ?? entry.year ?? "?");
  const year = parseYear(yearLabel);

  return {
    slug: String(entry.slug ?? slugify(title)),
    title,
    subtitle: normalizeOptionalString(entry.subtitle ?? extractSubtitle(title)),
    authors: normalizeStringArray(entry.authors),
    authorLinks: normalizeAuthorLinks(entry.authorLinks),
    year,
    yearLabel,
    affiliateUrl: String(entry.affiliateUrl ?? "").trim(),
    coverUrl: normalizeOptionalString(entry.coverUrl),
    sourceUrl: String(entry.sourceUrl ?? DEFAULT_SOURCE_REPO_URL).trim(),
    section,
    isFree: typeof entry.isFree === "boolean" ? entry.isFree : inferFreeStatus(String(entry.affiliateUrl ?? "")),
    language: normalizeStringArray(entry.language).length > 0 ? normalizeStringArray(entry.language) : inferLanguage(section, title)
  };
}

export function upsertBook(catalog, entry) {
  const normalizedCatalog = normalizeCatalogSource(catalog);
  const normalizedEntry = normalizeBookRecord(entry);
  ensureSection(normalizedCatalog, normalizedEntry.section);

  const nextBooks = normalizedCatalog.books.filter((book) => book.slug !== normalizedEntry.slug);
  nextBooks.push(normalizedEntry);
  normalizedCatalog.books = sortBooks(nextBooks, normalizedCatalog.sections);
  return normalizedCatalog;
}

export function renderCatalogReadme(catalogInput) {
  const catalog = normalizeCatalogSource(catalogInput);
  const lines = [];

  lines.push(`# ${catalog.meta.title}`);
  lines.push("");
  lines.push(`<!-- ${catalog.meta.generatedReadmeNotice} -->`);
  lines.push("");

  for (const paragraph of catalog.meta.intro) {
    lines.push(paragraph);
    lines.push("");
  }

  for (const [index, section] of catalog.sections.entries()) {
    const books = catalog.books.filter((book) => book.section === section.title);
    if (books.length === 0) {
      continue;
    }

    if (index > 0 || section.title !== catalog.meta.title) {
      lines.push(`# ${section.title}`);
      lines.push("");
    }

    lines.push("| Cover | Title | Author | Author's social media | Year | Link |");
    lines.push("|------------------|------------------|-------------------------|-------------|-------------|-------------|");

    for (const book of books) {
      lines.push(renderBookRow(book));
    }

    lines.push("");
    lines.push("");
  }

  if (catalog.meta.otherLists?.length) {
    lines.push(`## ${catalog.meta.otherListsHeading}`);
    lines.push("");
    for (const link of catalog.meta.otherLists) {
      lines.push(`[${link.label}](${link.url})  `);
    }
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function sortBooks(entries, sections = createCatalogSource().sections) {
  const sectionOrder = new Map(sections.map((section, index) => [section.title, index]));

  return [...entries].sort((left, right) => {
    const leftRank = sectionOrder.get(left.section) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = sectionOrder.get(right.section) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    if (right.year !== left.year) {
      return right.year - left.year;
    }
    return left.title.localeCompare(right.title);
  });
}

export function inferFreeStatus(url) {
  return (
    /\.pdf(?:$|\?)/i.test(url) ||
    /(storybasedinquiry|tcij|unesco|gijn|aljazeera|datajournalism\.com)/i.test(url)
  );
}

export function inferLanguage(section, title) {
  if (/german/i.test(section)) {
    return ["German"];
  }
  if (/[ãõçéíóúüöäß]/i.test(title)) {
    return ["Portuguese"];
  }
  return ["English"];
}

export function extractSubtitle(title) {
  const parts = title.split(/:\s+/);
  if (parts.length < 2) {
    return undefined;
  }
  return parts.slice(1).join(": ").trim();
}

export function parseYear(value) {
  const match = String(value ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSections(sections) {
  const defaults = createCatalogSource().sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    return defaults;
  }

  return sections.map((section, index) => ({
    slug: String(section?.slug ?? slugify(section?.title ?? defaults[index]?.title ?? `section-${index + 1}`)),
    title: String(section?.title ?? defaults[index]?.title ?? `Section ${index + 1}`).trim()
  }));
}

function ensureSection(catalog, sectionTitle) {
  if (catalog.sections.some((section) => section.title === sectionTitle)) {
    return;
  }

  catalog.sections.push({
    slug: slugify(sectionTitle),
    title: sectionTitle
  });
}

function normalizeYearLabel(value) {
  const text = String(value ?? "?").trim();
  if (!text) {
    return "?";
  }

  const match = text.match(/\d{4}/);
  return match ? match[0] : text;
}

function normalizeOptionalString(value) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeAuthorLinks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      label: String(item?.label ?? "").trim(),
      url: String(item?.url ?? "").trim()
    }))
    .filter((item) => item.label && item.url);
}

function renderBookRow(book) {
  const authorText = escapePipes(book.authors.join(", "));
  const authorLinks = renderAuthorLinks(book.authorLinks);
  const title = escapePipes(book.title);

  return `| ![${title}](${book.coverUrl ?? ""}) | ${title} | ${authorText} | ${authorLinks} | ${book.yearLabel} | ${book.affiliateUrl} |`;
}

function renderAuthorLinks(links) {
  if (!Array.isArray(links) || links.length === 0) {
    return "";
  }

  return links.map((link) => `[${escapePipes(link.label)}](${link.url})`).join(", ");
}

function escapePipes(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}
