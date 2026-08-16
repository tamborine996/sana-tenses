import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../data/articles.json', import.meta.url);
const articles = JSON.parse(await readFile(file, 'utf8'));
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');

const requiredText = (value, label) => {
  assert.equal(typeof value, 'string', `${label}: must be text`);
  assert.ok(value.trim().length > 0, `${label}: must not be empty`);
};

assert.ok(Array.isArray(articles) && articles.length > 0, 'At least one article is required');
assert.doesNotMatch(indexHtml, /<main[^>]+aria-live=/i, 'The complete reader must not be one oversized live region');
assert.doesNotMatch(indexHtml, /<(input|textarea|select|form)\b/i, 'The reading page must not contain answer or submission controls');
assert.doesNotMatch(appJs, /make\(['"](?:input|textarea|select|form)['"]/i, 'The rendered reader must not create answer or submission controls');
assert.doesNotMatch(appJs, /\b(score|correct answer|automated marking)\b/i, 'The rendered reader must not introduce scoring or marking');
assert.match(appJs, /prefers-reduced-motion/, 'Question reveal must respect reduced-motion preferences');
assert.match(appJs, /questionHeading\.focus/, 'Question reveal must move focus to its heading');

for (const article of articles) {
  assert.match(article.id, /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/, `${article.id}: invalid id`);
  assert.match(article.date, /^\d{4}-\d{2}-\d{2}$/, `${article.id}: invalid date`);
  assert.ok(!Number.isNaN(Date.parse(`${article.date}T12:00:00Z`)), `${article.id}: date must be parseable`);
  requiredText(article.category, `${article.id}.category`);
  requiredText(article.readingTime, `${article.id}.readingTime`);
  requiredText(article.title, `${article.id}.title`);
  requiredText(article.standfirst, `${article.id}.standfirst`);
  assert.ok(Array.isArray(article.paragraphs) && article.paragraphs.length >= 4, `${article.id}: use at least four paragraphs`);
  article.paragraphs.forEach((paragraph, index) => requiredText(paragraph, `${article.id}.paragraphs[${index}]`));

  const articleWords = article.paragraphs.join(' ').trim().split(/\s+/).length;
  assert.ok(articleWords >= 300 && articleWords <= 500, `${article.id}: article must be 300–500 words; found ${articleWords}`);

  assert.ok(Array.isArray(article.questions), `${article.id}: questions must be an array`);
  assert.equal(article.questions.length, 5, `${article.id}: exactly five questions are required`);
  article.questions.forEach((question, index) => {
    for (const field of ['label', 'tense', 'prompt', 'support']) {
      requiredText(question[field], `${article.id}.questions[${index}].${field}`);
    }
  });
  assert.match(article.questions[0].prompt.toLowerCase(), /what happens/, `${article.id}: question one must ask what happens in the text`);

  const questionLanguage = article.questions.slice(1).map((question) => `${question.prompt} ${question.support}`.toLowerCase()).join(' ');
  assert.match(questionLanguage, /\b(had|did|was|were|happened|bit|stayed|escaped)\b/, `${article.id}: prompts/support must practise past language`);
  assert.match(questionLanguage, /\b(today|now|does|do|is|are|changes|encourages|shows|makes)\b/, `${article.id}: prompts/support must practise present language`);
  assert.match(questionLanguage, /\b(future|will|might|should|going to)\b/, `${article.id}: prompts/support must practise future language`);

  assert.ok(article.source && typeof article.source === 'object', `${article.id}: source details are required`);
  assert.equal(article.source.name, 'BBC News', `${article.id}: BBC News attribution is required`);
  requiredText(article.source.originalTitle, `${article.id}.source.originalTitle`);
  assert.match(article.source.url, /^https:\/\/(www\.)?bbc\.(co\.uk|com)\//, `${article.id}: invalid BBC source URL`);
  assert.ok(!Number.isNaN(Date.parse(article.source.published)), `${article.id}: source.published must be parseable`);
  assert.equal(article.source.published.slice(0, 10), article.date, `${article.id}: article date must match the credited source publication date`);
}

console.log(`Validated ${articles.length} article(s): schema, dates, 300–500 word length, five questions, prompt-level tense coverage, BBC attribution and no-scoring UI contract all pass.`);
