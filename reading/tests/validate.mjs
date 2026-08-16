import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../data/articles.json', import.meta.url);
const articles = JSON.parse(await readFile(file, 'utf8'));

assert.ok(Array.isArray(articles) && articles.length > 0, 'At least one article is required');

for (const article of articles) {
  assert.match(article.id, /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/, `${article.id}: invalid id`);
  assert.match(article.date, /^\d{4}-\d{2}-\d{2}$/, `${article.id}: invalid date`);
  assert.ok(article.title && article.standfirst, `${article.id}: title and standfirst are required`);
  assert.ok(Array.isArray(article.paragraphs) && article.paragraphs.length >= 4, `${article.id}: use at least four paragraphs`);

  const articleWords = article.paragraphs.join(' ').trim().split(/\s+/).length;
  assert.ok(articleWords >= 300 && articleWords <= 500, `${article.id}: article must be 300–500 words; found ${articleWords}`);

  assert.equal(article.questions.length, 5, `${article.id}: exactly five questions are required`);
  assert.match(article.questions[0].prompt.toLowerCase(), /what happens/, `${article.id}: question one must ask what happens in the text`);

  const tenseLabels = article.questions.map((question) => question.tense.toLowerCase()).join(' ');
  assert.match(tenseLabels, /past/, `${article.id}: questions must practise past language`);
  assert.match(tenseLabels, /present/, `${article.id}: questions must practise present language`);
  assert.match(tenseLabels, /future/, `${article.id}: questions must practise future language`);

  assert.equal(article.source.name, 'BBC News', `${article.id}: BBC News attribution is required`);
  assert.match(article.source.url, /^https:\/\/(www\.)?bbc\.(co\.uk|com)\//, `${article.id}: invalid BBC source URL`);
}

console.log(`Validated ${articles.length} article(s): structure, 300–500 word length, five questions, tense coverage and BBC attribution all pass.`);
