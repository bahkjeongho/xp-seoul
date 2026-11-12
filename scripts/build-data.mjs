import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const POSSIBLE_VAULT_PATHS = [
  path.resolve(process.env.HOME || '/Users/parkjeongho', 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Hide Park'),
  path.resolve(process.env.HOME || '/Users/parkjeongho', 'Developer/Hide-Park/content'),
  path.resolve(ROOT_DIR, '../Hide-Park/content'),
];

const VAULT_CONTENT_DIR = POSSIBLE_VAULT_PATHS.find((p) => fs.existsSync(p)) || POSSIBLE_VAULT_PATHS[0];
const PUBLIC_DATA_DIR = path.resolve(ROOT_DIR, 'public/data');
const PUBLIC_NOTES_DIR = path.resolve(ROOT_DIR, 'public/data/notes');
const SRC_DATA_DIR = path.resolve(ROOT_DIR, 'src/data');

for (const dir of [PUBLIC_DATA_DIR, PUBLIC_NOTES_DIR, SRC_DATA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanWikilink(str) {
  if (!str) return '';
  let s = String(str).trim().replace(/^["']|["']$/g, '').trim();
  const m = s.match(/^\[\[([^\]]*)\]\]$/);
  if (m) {
    s = m[1].split('|').pop().trim();
  }
  return s.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
}

function parseFrontmatterValue(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(item => cleanWikilink(String(item))).filter(Boolean);
  }
  return [cleanWikilink(String(raw))].filter(Boolean);
}

function parseYamlFrontmatter(text) {
  if (!text.startsWith('---')) return { data: {}, content: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, content: text };
  
  const yamlBlock = text.slice(3, end).trim();
  const content = text.slice(end + 4).trim();
  
  const data = {};
  const lines = yamlBlock.split('\n');
  let currentKey = null;

  for (let line of lines) {
    const listMatch = line.match(/^\s*-\s*(.*)$/);
    if (listMatch && currentKey) {
      const val = listMatch[1].trim().replace(/^["']|["']$/g, '');
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(cleanWikilink(val));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const val = keyMatch[2].trim();
      if (val === '') {
        data[currentKey] = [];
      } else {
        const cleaned = val.replace(/^["']|["']$/g, '');
        data[currentKey] = cleanWikilink(cleaned);
      }
    }
  }

  return { data, content };
}

function extractCallout(content, type) {
  const regex = new RegExp(`>\\s*\\[!${type}\\]([^\\n]*)\\n((?:>[^\\n]*\\n?)*)`, 'i');
  const match = content.match(regex);
  if (!match) return '';
  const lines = match[2].split('\n')
    .map(l => l.replace(/^>\s?/, '').trim())
    .filter(Boolean);
  return lines.join(' ').replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1');
}

function scanDir(dir, folderType, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Exclude system/private folders
      if (
        entry.name !== '.trash' &&
        entry.name !== '.obsidian' &&
        entry.name !== '.smart-env' &&
        entry.name !== '00. Template' &&
        entry.name !== '1. System' &&
        entry.name !== '10. Clipping Origin' &&
        entry.name !== '0. Clipping Origin' &&
        entry.name !== 'E_Text'
      ) {
        scanDir(fullPath, folderType, list);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      list.push({ fullPath, filename: entry.name, folderType });
    }
  }
  return list;
}

console.log(`Scanning notes from Obsidian Vault: ${VAULT_CONTENT_DIR}...`);

function findSubDir(parent, candidates) {
  for (const cand of candidates) {
    const p = path.join(parent, cand);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Support both new reorganized folders (A_Wiki, B_Object) and legacy fallbacks
const wikiDir = findSubDir(VAULT_CONTENT_DIR, ['A_Wiki', '2. Wiki', '2 Wiki']);
const objectDir = findSubDir(VAULT_CONTENT_DIR, ['B_Object', '3. Object', '3 Object']);
const legacyClippingDir = findSubDir(VAULT_CONTENT_DIR, ['0. Clipping', '0 Clipping']);

const wikiFiles = [
  ...(wikiDir ? scanDir(wikiDir, 'wiki') : []),
  ...(objectDir ? scanDir(objectDir, 'object') : []),
  ...(legacyClippingDir ? scanDir(legacyClippingDir, 'clipping') : []),
];

console.log(`Found ${wikiFiles.length} markdown notes in vault.`);

const notes = [];
const taxonomyTree = {};

for (const file of wikiFiles) {
  try {
    const raw = fs.readFileSync(file.fullPath, 'utf-8');
    const { data, content } = parseYamlFrontmatter(raw);
    const id = path.basename(file.filename, '.md');
    const title = id;
    const hash = crypto.createHash('sha1').update(id).digest('hex');

    const categories = parseFrontmatterValue(data['Category']);
    const subCategories = parseFrontmatterValue(data['Sub-Category']);
    const fields = parseFrontmatterValue(data['Field']);
    const subFields = parseFrontmatterValue(data['Sub-Field']);
    const types = parseFrontmatterValue(data['Type']);
    const subTypes = parseFrontmatterValue(data['Sub-Type']);
    const topics = parseFrontmatterValue(data['Topic']);

    const category = categories[0] || (file.folderType === 'object' ? 'Object' : 'Uncategorized');
    const subCategory = subCategories[0] || '';
    const field = fields[0] || '';
    const subField = subFields[0] || '';
    const type = types[0] || '';
    const subType = subTypes[0] || '';
    const topic = topics[0] || '';

    // Unlisted Rule 1: Subfolders in A_Wiki (A1_Hub, A2_K-Pop Idol, A3_Academic Program, A4_Journal, A5_Sports Team)
    // or any note under B_Object
    const isFolderUnlisted = (
      file.folderType === 'object' ||
      file.fullPath.includes('/B_Object/') ||
      file.fullPath.includes('/A1_Hub/') ||
      file.fullPath.includes('/A2_K-Pop Idol/') ||
      file.fullPath.includes('/A3_Academic Program/') ||
      file.fullPath.includes('/A4_Journal/') ||
      file.fullPath.includes('/A5_Sports Team/') ||
      file.fullPath.includes('K-Pop Idol') ||
      file.fullPath.includes('Academic Program') ||
      file.fullPath.includes('Sports Team') ||
      file.fullPath.includes('Journal')
    );

    // Unlisted Rule 2: Pure Technology or Humanities category without creative/cultural overlap
    // (If note only has Technology/Humanities, and lacks Creative, The Arts, Design, Media, Culture, Entertainment, Business)
    const isPureNonCreativeCategory = (
      categories.length > 0 &&
      categories.every((c) => c === 'Technology' || c === 'Humanities')
    );

    const isUnlisted = isFolderUnlisted || isPureNonCreativeCategory;

    // Taxonomy Tree hierarchy (Only count listed notes in category counts)
    if (category && !isUnlisted) {
      if (!taxonomyTree[category]) taxonomyTree[category] = { count: 0, subCategories: {} };
      taxonomyTree[category].count++;

      if (subCategory) {
        if (!taxonomyTree[category].subCategories[subCategory]) {
          taxonomyTree[category].subCategories[subCategory] = { count: 0, topics: {} };
        }
        taxonomyTree[category].subCategories[subCategory].count++;

        if (topic) {
          if (!taxonomyTree[category].subCategories[subCategory].topics[topic]) {
            taxonomyTree[category].subCategories[subCategory].topics[topic] = 0;
          }
          taxonomyTree[category].subCategories[subCategory].topics[topic]++;
        }
      }
    }

    const tldr = extractCallout(content, 'tldr');
    const info = extractCallout(content, 'info');
    const summary = extractCallout(content, 'summary');

    const aliases = parseFrontmatterValue(data['aliases']);
    const ig = Array.isArray(data['IG']) ? data['IG'][0] : (data['IG'] || '');
    const website = Array.isArray(data['Website']) ? data['Website'][0] : (data['Website'] || '');
    const genres = parseFrontmatterValue(data['Genre']);
    const labels = parseFrontmatterValue(data['Labels']);
    const cities = parseFrontmatterValue(data['Cities']);
    const countries = parseFrontmatterValue(data['Countries']);

    // Extract tags from frontmatter and inline hashtags
    const frontmatterTags = parseFrontmatterValue(data['tags'] || data['Tags'] || data['tag']);
    const inlineTags = Array.from(content.matchAll(/(?:^|\s)#([a-zA-Z가-힣0-9_-]+)/g))
      .map(m => m[1].trim())
      .filter(t => !/^[0-9]+$/.test(t));
    const tags = Array.from(new Set([...frontmatterTags, ...inlineTags]));

    // Capture ALL frontmatter attributes dynamically so nothing is hidden
    const allProps = {};
    for (const [k, v] of Object.entries(data)) {
      allProps[k] = Array.isArray(v) ? v.map(cleanWikilink) : cleanWikilink(String(v));
    }

    const noteObj = {
      id,
      title,
      hash,
      folderType: file.folderType,
      aliases,
      category,
      subCategory,
      field,
      subField,
      type,
      subType,
      topic,
      topics,
      tags,
      ig,
      website,
      genres,
      labels,
      cities,
      countries,
      tldr,
      info,
      summary,
      rawContent: content,
      allProps,
      ...(isUnlisted ? { unlisted: true } : {}),
    };

    notes.push(noteObj);

    // Save individual note detail in public/data/notes/<hash>.json
    fs.writeFileSync(path.join(PUBLIC_NOTES_DIR, `${hash}.json`), JSON.stringify(noteObj));
  } catch (err) {
    console.error(`Error processing ${file.filename}:`, err);
  }
}

// Sort notes by title alphabetically
notes.sort((a, b) => a.title.localeCompare(b.title, 'ko'));

console.log(`Successfully processed ${notes.length} notes.`);

// Write light index
const lightNotes = notes.map(({ id, title, hash, folderType, aliases, category, subCategory, field, subField, type, subType, topic, topics, tags, ig, website, tldr, info, cities, countries, unlisted }) => ({
  id,
  title,
  hash,
  folderType,
  aliases,
  category,
  subCategory,
  field,
  subField,
  type,
  subType,
  topic,
  topics,
  tags: tags || [],
  ig,
  website,
  tldr,
  info,
  cities,
  countries,
  ...(unlisted ? { unlisted: true } : {}),
}));

fs.writeFileSync(path.join(SRC_DATA_DIR, 'notes-light.json'), JSON.stringify(lightNotes));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'notes-light.json'), JSON.stringify(lightNotes));
fs.writeFileSync(path.join(SRC_DATA_DIR, 'taxonomy.json'), JSON.stringify(taxonomyTree, null, 2));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'taxonomy.json'), JSON.stringify(taxonomyTree, null, 2));

// Generate multi-facet taxonomy (Category, Type, Field, Region)
console.log('Generating multi-facet taxonomy (Category, Type, Field, Region)...');
const allTopicsMap = {};
const byCategory = {};
const byType = {};
const byField = {};
const byRegion = {};

const recordTopic = (topicsRecord, topicName) => {
  if (!topicName) return;
  topicsRecord[topicName] = (topicsRecord[topicName] || 0) + 1;
  allTopicsMap[topicName] = (allTopicsMap[topicName] || 0) + 1;
};

const populateAxis = (axisMap, primaryName, secondaryName, noteTopics) => {
  if (!primaryName) return;
  if (!axisMap[primaryName]) {
    axisMap[primaryName] = { count: 0, subs: {}, topics: {} };
  }
  axisMap[primaryName].count++;

  if (secondaryName) {
    if (!axisMap[primaryName].subs[secondaryName]) {
      axisMap[primaryName].subs[secondaryName] = { count: 0, topics: {} };
    }
    axisMap[primaryName].subs[secondaryName].count++;
  }

  for (const top of noteTopics) {
    recordTopic(axisMap[primaryName].topics, top);
    if (secondaryName) {
      recordTopic(axisMap[primaryName].subs[secondaryName].topics, top);
    }
  }
};

for (const note of lightNotes) {
  if (note.unlisted) continue; // Only count listed notes in filter facets
  const noteTopics = [
    ...(note.topic ? [note.topic] : []),
    ...(Array.isArray(note.topics) ? note.topics : []),
  ];
  const uniqueTopics = [...new Set(noteTopics.filter(Boolean))];

  populateAxis(byCategory, note.category, note.subCategory, uniqueTopics);
  populateAxis(byType, note.type, note.subType, uniqueTopics);
  populateAxis(byField, note.field, note.subField, uniqueTopics);

  const countries = Array.isArray(note.countries) ? note.countries : [];
  const cities = Array.isArray(note.cities) ? note.cities : [];

  if (countries.length > 0) {
    for (const country of countries) {
      if (!country) continue;
      if (cities.length > 0) {
        for (const city of cities) {
          populateAxis(byRegion, country, city, uniqueTopics);
        }
      } else {
        populateAxis(byRegion, country, null, uniqueTopics);
      }
    }
  } else if (cities.length > 0) {
    for (const city of cities) {
      populateAxis(byRegion, 'Other Region', city, uniqueTopics);
    }
  }
}

const allTopics = Object.entries(allTopicsMap)
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => ({ name, count }));

const facetTaxonomy = {
  allTopics,
  byCategory,
  byType,
  byField,
  byRegion,
};

fs.writeFileSync(path.join(SRC_DATA_DIR, 'facet-taxonomy.json'), JSON.stringify(facetTaxonomy, null, 2));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'facet-taxonomy.json'), JSON.stringify(facetTaxonomy, null, 2));

// Parse C_Blog from Obsidian vault directly without any artificial mock data
const blogDir = findSubDir(VAULT_CONTENT_DIR, ['C_Blog']);
const blogPosts = [];
if (blogDir && fs.existsSync(blogDir)) {
  const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
  for (const f of blogFiles) {
    const full = path.join(blogDir, f);
    const raw = fs.readFileSync(full, 'utf-8');
    const stat = fs.statSync(full);
    const { data, content } = parseYamlFrontmatter(raw);
    const title = f.replace(/\.md$/, '');
    const date = data.date || data.Date || stat.mtime.toISOString().slice(0, 10).replace(/-/g, '.');
    const tags = parseFrontmatterValue(data.tag || data.tags || data.Tag || data.Tags);
    blogPosts.push({
      id: title,
      title,
      date,
      tags,
      content: content.trim(),
    });
  }
}
fs.writeFileSync(path.join(SRC_DATA_DIR, 'blog-posts.json'), JSON.stringify(blogPosts, null, 2));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'blog-posts.json'), JSON.stringify(blogPosts, null, 2));
console.log(`Parsed ${blogPosts.length} blog posts from C_Blog.`);

// Extract Linked Mentions (Backlinks Index) across all notes
console.log('Generating Linked Mentions (Backlinks Index)...');
const backlinksMap = {};
for (const note of notes) {
  const sourceId = note.id;
  const rawContent = note.rawContent || '';
  const lines = rawContent.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const matches = line.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
    for (const match of matches) {
      const rawTarget = match[1].trim();
      const target = rawTarget.split('#')[0].trim();
      if (!target) continue;
      const targetKey = target.toLowerCase();
      // Skip self backlink
      if (targetKey === sourceId.toLowerCase()) continue;
      if (!backlinksMap[targetKey]) {
        backlinksMap[targetKey] = [];
      }
      const existing = backlinksMap[targetKey].find(b => b.sourceId === sourceId && b.context === line);
      if (!existing) {
        backlinksMap[targetKey].push({
          sourceId,
          context: line.slice(0, 200),
        });
      }
    }
  }
}
fs.writeFileSync(path.join(SRC_DATA_DIR, 'backlinks.json'), JSON.stringify(backlinksMap));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'backlinks.json'), JSON.stringify(backlinksMap));
console.log(`Generated backlinks for ${Object.keys(backlinksMap).length} target keys.`);

console.log(`Facet summary: ${Object.keys(byCategory).length} categories, ${Object.keys(byType).length} types, ${Object.keys(byField).length} fields, ${Object.keys(byRegion).length} countries/regions, ${allTopics.length} topics.`);
console.log('Finished writing all data files to src/data and public/data!');
