# English Reading Practice

A phone-first, tutor-led reading routine inside the existing Sana Tenses GitHub Pages site.

## Product contract

- Show one calm current reading at a time.
- Use a faithful 300–500 word adaptation, not a word-for-word republication.
- Credit and link the original BBC source clearly.
- Prefer accessible non-geopolitical topics while the routine is being established.
- Hide the questions until the reader deliberately finishes the article.
- Provide an Easy/Challenge switch with exactly ten verbal questions in each set.
- Easy question 1 must ask what happens in the text; the rest should check direct understanding and build confidence.
- Challenge questions should move beyond recall and practise past, present and future language.
- Include no answer boxes, scores or automated marking.

## Add an article

1. Add the newest item to `data/articles.json` with a unique date-based ID.
2. Keep the adapted body between 300 and 500 words.
3. Add exactly ten Easy and ten Challenge questions following the product contract above.
4. Install the test dependencies once, then run the content and phone-browser checks:

```bash
npm install --prefix reading
npm test --prefix reading
```

The suite validates the article/question contract and exercises the Easy/Challenge keyboard flow at 320px, 360px and 412px.

The page automatically displays the item with the newest `date`.

## Local preview

From the repository root:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/reading/`.
