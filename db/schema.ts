import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
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
    accountId: text('account_id'),
    installmentId: text('installment_id'),
    voidReason: text('void_reason'),
    voidAuthor: text('void_author'),
    voidDate: text('void_date'),
    operation: text('operation'),
    author: text('author').notNull(),
    created: text('created').notNull(),
  },
  (t) => [
    uniqueIndex('payment_receipt').on(t.recordId, t.concept, t.reference),
    uniqueIndex('payment_operation').on(t.operation),
    index('idx_payments_account').on(t.accountId),
  ],
);

export const people = sqliteTable(
  'people',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    document: text('document').notNull(),
    phone: text('phone').notNull().default(''),
    address: text('address').notNull().default(''),
    version: integer('version').notNull().default(1),
    created: text('created').notNull(),
  },
  (t) => [
    uniqueIndex('person_document_unique')
      .on(t.document)
      .where(sql`${t.document} <> ''`),
  ],
);
export const personSources = sqliteTable(
  'person_sources',
  {
    recordId: text('record_id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id),
    reason: text('reason').notNull(),
  },
  (t) => [index('idx_person_sources_person').on(t.personId)],
);
export const lots = sqliteTable(
  'lots',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id),
    name: text('name').notNull(),
    project: text('project').notNull(),
    contract: text('contract').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('lot_person_project_name').on(t.personId, t.project, t.name),
  ],
);
export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    lotId: text('lot_id')
      .notNull()
      .references(() => lots.id),
    concept: text('concept').notNull(),
    agreed: integer('agreed'),
    opening: integer('opening').notNull().default(0),
    openingConfirmed: integer('opening_confirmed').notNull().default(0),
    openingDate: text('opening_date').notNull().default(''),
    evidence: text('evidence').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [uniqueIndex('account_lot_concept').on(t.lotId, t.concept)],
);
export const installments = sqliteTable(
  'installments',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    due: text('due').notNull(),
    cents: integer('cents').notNull(),
  },
  (t) => [index('idx_installments_account').on(t.accountId)],
);
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id),
    kind: text('kind').notNull(),
    description: text('description').notNull(),
    due: text('due').notNull(),
    amount: integer('amount'),
    done: integer('done').notNull().default(0),
    version: integer('version').notNull().default(1),
    author: text('author').notNull(),
    created: text('created').notNull(),
  },
  (t) => [index('idx_tasks_person').on(t.personId)],
);
export const changes = sqliteTable(
  'changes',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id),
    entity: text('entity').notNull(),
    before: text('before').notNull(),
    after: text('after').notNull(),
    reason: text('reason').notNull(),
    author: text('author').notNull(),
    created: text('created').notNull(),
  },
  (t) => [index('idx_changes_person').on(t.personId)],
);
