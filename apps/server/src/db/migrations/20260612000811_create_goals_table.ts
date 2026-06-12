import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('goal', (t) => {
    t.increments('id').primary();
    t.string('type').notNullable(); // 'daily_minutes' | 'yearly_books'
    t.integer('target').notNullable();
    t.timestamps(true, true);
    t.unique(['type']);
  });

  await knex.schema.createTable('goal_achievement', (t) => {
    t.increments('id').primary();
    t.string('type').notNullable();
    t.string('period').notNullable(); // '2026-06-11' (day) | '2026' (year)
    t.integer('target').notNullable();
    t.integer('value').notNullable();
    t.timestamp('achieved_at').defaultTo(knex.fn.now());
    t.unique(['type', 'period']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('goal');
  await knex.schema.dropTableIfExists('goal_achievement');
}
