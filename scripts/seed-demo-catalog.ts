import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

const shelves = [
  { name: 'Classics', slug: 'classics' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Science Fiction', slug: 'science-fiction' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Adventure', slug: 'adventure' },
  { name: 'Romance', slug: 'romance' },
];

const catalog = [
  { title: 'Pride and Prejudice', author: 'Jane Austen', publishedAt: '1813-01-28', description: 'A witty, enduring novel about first impressions, family, and finding a worthy partner.', categories: ['classics', 'romance'] },
  { title: 'Frankenstein', author: 'Mary Shelley', publishedAt: '1818-01-01', description: 'A young scientist creates life and must face the consequences of abandoning his creation.', categories: ['classics', 'science-fiction'] },
  { title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', publishedAt: '1892-10-14', description: 'Twelve clever cases featuring Sherlock Holmes and his observant friend Dr. Watson.', categories: ['classics', 'mystery'] },
  { title: 'Dracula', author: 'Bram Stoker', publishedAt: '1897-05-26', description: 'A chilling epistolary tale follows a group determined to stop Count Dracula.', categories: ['classics', 'fantasy'] },
  { title: 'The Time Machine', author: 'H. G. Wells', publishedAt: '1895-01-01', description: 'An inventor travels far into the future and discovers a changed human world.', categories: ['classics', 'science-fiction'] },
  { title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', publishedAt: '1900-05-17', description: 'Dorothy and her companions follow the yellow brick road in search of home and courage.', categories: ['classics', 'fantasy', 'adventure'] },
  { title: 'A Tale of Two Cities', author: 'Charles Dickens', publishedAt: '1859-11-26', description: 'A story of sacrifice and renewal set against the upheaval of the French Revolution.', categories: ['classics', 'adventure'] },
  { title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', publishedAt: '1865-11-26', description: 'Alice tumbles into a playful, topsy-turvy world of curious characters and wordplay.', categories: ['classics', 'fantasy'] },
  { title: 'The Call of the Wild', author: 'Jack London', publishedAt: '1903-06-01', description: 'Buck is taken from his comfortable life and must adapt to the harsh Yukon wilderness.', categories: ['classics', 'adventure'] },
  { title: 'The Secret Garden', author: 'Frances Hodgson Burnett', publishedAt: '1911-08-01', description: 'A lonely child discovers a hidden garden and helps bring new life to an old estate.', categories: ['classics', 'adventure'] },
];

async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();
    for (const shelf of shelves) {
      const category = await tx.category.upsert({
        where: { slug: shelf.slug },
        update: {},
        create: shelf,
      });
      categoryIds.set(shelf.slug, category.id);
    }

    let added = 0;
    let kept = 0;
    for (const book of catalog) {
      let author = await tx.author.findFirst({ where: { name: book.author } });
      if (!author) author = await tx.author.create({ data: { name: book.author } });

      const existing = await tx.book.findFirst({ where: { title: book.title } });
      if (existing) {
        kept += 1;
        continue;
      }
      const data = {
        title: book.title,
        description: book.description,
        publishedAt: new Date(`${book.publishedAt}T00:00:00.000Z`),
      };
      const relatedAuthor = { id: author.id };
      const relatedCategories = book.categories.map((slug) => ({ id: categoryIds.get(slug)! }));
      await tx.book.create({
        data: {
          ...data,
          isbn: null,
          authors: { connect: [relatedAuthor] },
          categories: { connect: relatedCategories },
        },
      });
      added += 1;
    }

    console.log(`Demo catalog ready: ${added} books added, ${kept} matching titles kept unchanged, ${shelves.length} shelves ensured.`);
  });
}

main()
  .catch((error: unknown) => {
    console.error('Could not seed the demo catalog:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
