import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';

const root = new URL('../books/wizard-of-oz/', import.meta.url);
const book = JSON.parse(await readFile(new URL('data/book.json', root), 'utf8'));

assert.equal(book.id, 'the-wonderful-wizard-of-oz');
assert.equal(book.title, 'The Wonderful Wizard of Oz');
assert.equal(book.author, 'L. Frank Baum');
assert.equal(book.illustrator, 'W. W. Denslow');
assert.equal(book.publicationYear, 1900);
assert.equal(book.language, 'en');
assert.equal(book.chapterCount, 24);
assert.ok(Array.isArray(book.chapters));
assert.equal(book.chapters.length, 24);
assert.match(book.source.metadataUrl, /^https:\/\/www\.gutenberg\.org\/ebooks\/43936$/);
assert.match(book.source.textUrl, /^https:\/\/www\.gutenberg\.org\//);
assert.match(book.source.sha256, /^[a-f0-9]{64}$/);
assert.match(book.source.rights, /public domain/i);

const titleSet = new Set();
let calculatedWords = 0;
for (const [index, chapter] of book.chapters.entries()) {
  const expectedNumber = index + 1;
  assert.equal(chapter.number, expectedNumber, `Chapter ${expectedNumber}: wrong sequence`);
  assert.equal(typeof chapter.roman, 'string');
  assert.equal(typeof chapter.title, 'string');
  assert.ok(chapter.title.trim(), `Chapter ${expectedNumber}: missing title`);
  assert.ok(!titleSet.has(chapter.title), `Chapter ${expectedNumber}: duplicate title`);
  titleSet.add(chapter.title);
  assert.ok(Array.isArray(chapter.paragraphs) && chapter.paragraphs.length > 0, `Chapter ${expectedNumber}: missing text`);
  chapter.paragraphs.forEach((paragraph, paragraphIndex) => {
    assert.equal(typeof paragraph, 'string', `Chapter ${expectedNumber}, paragraph ${paragraphIndex + 1}: not text`);
    assert.ok(paragraph.trim(), `Chapter ${expectedNumber}, paragraph ${paragraphIndex + 1}: empty`);
    assert.doesNotMatch(paragraph, /\[Pg \d+\]/, `Chapter ${expectedNumber}: page-number artefact`);
  });
  const words = chapter.paragraphs.join(' ').trim().split(/\s+/).length;
  assert.equal(chapter.wordCount, words, `Chapter ${expectedNumber}: word count mismatch`);
  calculatedWords += words;
  assert.match(chapter.image, /^assets\/chapter-\d{2}\.jpg$/);
  const image = new URL(chapter.image, root);
  await access(image);
  assert.ok((await stat(image)).size > 10_000, `Chapter ${expectedNumber}: illustration is unexpectedly small`);
}

assert.equal(book.wordCount, calculatedWords);
assert.ok(book.wordCount >= 38_000 && book.wordCount <= 41_000, `Unexpected unabridged word count: ${book.wordCount}`);
await access(new URL(book.cover, root));
assert.ok((await stat(new URL(book.cover, root))).size > 50_000, 'Cover image is unexpectedly small');

console.log(`Validated ${book.chapterCount} chapters, ${book.wordCount} words, source provenance, cover and chapter art.`);
