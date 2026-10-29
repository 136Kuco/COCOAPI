import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const keys = sqliteTable('api_keys', {id:text('id').primaryKey(),name:text('name').notNull(),hash:text('hash').notNull().unique(),prefix:text('prefix').notNull(),enabled:integer('enabled').notNull().default(1),created:text('created').notNull()});
export const logs = sqliteTable('request_logs',{id:text('id').primaryKey(),keyId:text('key_id').notNull(),at:text('at').notNull(),status:integer('status').notNull(),category:text('category').notNull(),latency:integer('latency').notNull()});
export const connectionTests = sqliteTable('connection_tests', {
 id:text('id').primaryKey(),day:text('day').notNull(),at:text('at').notNull(),
 status:integer('status').notNull(),category:text('category').notNull(),latency:integer('latency').notNull(),
 model:text('model').notNull(),upstreamStatus:integer('upstream_status'),
 inputTokens:integer('input_tokens'),outputTokens:integer('output_tokens'),
});
export const providerSecrets = sqliteTable('provider_secrets', {
 provider:text('provider').primaryKey(),envelope:text('envelope'),
 revision:text('revision').notNull(),updatedAt:text('updated_at').notNull(),
});
