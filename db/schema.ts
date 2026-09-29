import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  hash: text('hash').notNull(),
  role: text('role').notNull(),
  active: integer('active').notNull().default(1),
  mustChange: integer('must_change').notNull().default(1),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expires: integer('expires').notNull(),
});
export const attempts = sqliteTable('attempts', {
  id: text('id').primaryKey(),
  count: integer('count').notNull(),
  expires: integer('expires').notNull(),
});
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
export const datasets = sqliteTable('datasets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  objectKey: text('object_key').notNull(),
  sha256: text('sha256').notNull(),
  created: text('created').notNull(),
  manifest: text('manifest').notNull(),
});
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  objectKey: text('object_key').notNull(),
  size: integer('size').notNull(),
  created: text('created').notNull(),
  author: text('author').notNull(),
});
export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull(),
  kind: text('kind').notNull(),
  body: text('body').notNull(),
  created: text('created').notNull(),
  author: text('author').notNull(),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  userId: text('user_id').notNull(),
  target: text('target').notNull(),
  created: text('created').notNull(),
});

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    recordId: text('record_id').notNull(),
    concept: text('concept').notNull(),
    lot: text('lot').notNull(),
    cents: integer('cents').notNull(),
    date: text('date').notNull(),
    reference: text('reference').notNull(),
    author: text('author').notNull(),
    created: text('created').notNull(),
  },
  (t) => [
    uniqueIndex('payment_receipt').on(t.recordId, t.concept, t.reference),
  ],
);
