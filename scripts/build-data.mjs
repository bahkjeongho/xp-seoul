import fs from 'node:fs';
import path from 'node:path';

const VAULT_CONTENT_DIR = path.resolve('../Hide-Park/content');
const PUBLIC_DATA_DIR = path.resolve('./public/data');
const SRC_DATA_DIR = path.resolve('./src/data');

for (const dir of [PUBLIC_DATA_DIR, SRC_DATA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanWikilink(str) {
  if (!str) return '';
  return str.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
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
  const regex = new RegExp(`>\\s*\\[!${type}\\]([^\n]*)\n((?:>[^\n]*\n?)*)`, 'i');
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
      if (entry.name !== '.trash') {
        scanDir(fullPath, folderType, list);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      list.push({ fullPath, filename: entry.name, folderType });
    }
  }
  return list;
}

console.log('Scanning notes from Hide-Park/content...');
const wikiFiles = [
  ...scanDir(path.join(VAULT_CONTENT_DIR, '2 Wiki'), 'wiki'),
  ...scanDir(path.join(VAULT_CONTENT_DIR, '0 Clipping'), 'clipping'),
  ...scanDir(path.join(VAULT_CONTENT_DIR, '3 Object'), 'object'),
];

console.log(`Found ${wikiFiles.length} files.`);

const notes = [];
const taxonomyTree = {};

for (const file of wikiFiles) {
  try {
    const raw = fs.readFileSync(file.fullPath, 'utf-8');
    const { data, content } = parseYamlFrontmatter(raw);
    const id = path.basename(file.filename, '.md');
    const title = id;

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

    // Taxonomy Tree hierarchy
    if (category) {
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

    notes.push({
      id,
      title,
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
    });
  } catch (err) {
    console.error(`Error processing ${file.filename}:`, err);
  }
}

// Sort notes by title alphabetically
notes.sort((a, b) => a.title.localeCompare(b.title, 'ko'));

console.log(`Successfully processed ${notes.length} notes.`);

// Write full data
fs.writeFileSync(path.join(SRC_DATA_DIR, 'notes.json'), JSON.stringify(notes));

// Write light index
const lightNotes = notes.map(({ id, title, folderType, aliases, category, subCategory, field, subField, type, subType, topic, topics, ig, website, tldr, info, cities, countries }) => ({
  id,
  title,
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
  ig,
  website,
  tldr,
  info,
  cities,
  countries
}));

fs.writeFileSync(path.join(SRC_DATA_DIR, 'notes-light.json'), JSON.stringify(lightNotes));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'notes-light.json'), JSON.stringify(lightNotes));
fs.writeFileSync(path.join(SRC_DATA_DIR, 'taxonomy.json'), JSON.stringify(taxonomyTree, null, 2));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'taxonomy.json'), JSON.stringify(taxonomyTree, null, 2));

// Clean up any notes dir in public if created earlier
const oldNotesDir = path.join(PUBLIC_DATA_DIR, 'notes');
if (fs.existsSync(oldNotesDir)) {
  fs.rmSync(oldNotesDir, { recursive: true, force: true });
}

console.log('Finished writing all data files to src/data and public/data!');
