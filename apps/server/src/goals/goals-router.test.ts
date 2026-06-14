import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Goal } from '@koinsight/common/types';
import { db } from '../knex';
import { createGoal } from '../db/factories/goal-factory';
import { goalsRouter } from './goals-router';

const app = express();
app.use(express.json());
app.use('/goals', goalsRouter);

describe('goalsRouter', () => {
  beforeEach(async () => {
    await db('goal_achievement').del();
    await db('goal').del();
  });

  afterEach(async () => {
    await db('goal_achievement').del();
    await db('goal').del();
  });

  describe('GET /goals/current', () => {
    it('returns goals with progress and achieved flags', async () => {
      await createGoal(db, { type: 'daily_minutes', target: 30 });

      const response = await request(app).get('/goals/current');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          type: 'daily_minutes',
          target: 30,
          progress: 0,
          achieved: false,
        })
      );
    });
  });

  describe('GET /goals/achievements', () => {
    it('returns the stored achievements', async () => {
      await db('goal_achievement').insert({
        type: 'daily_minutes',
        period: '2026-06-10',
        target: 30,
        value: 45,
        achieved_at: new Date('2026-06-10T23:59:59'),
      });

      const response = await request(app).get('/goals/achievements');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({ type: 'daily_minutes', period: '2026-06-10', value: 45 })
      );
    });
  });

  describe.each(['daily_minutes', 'yearly_books'] as const)('PUT /goals/%s', (type) => {
    it('upserts the goal target', async () => {
      const response = await request(app).put(`/goals/${type}`).send({ target: 42 });

      expect(response.status).toBe(200);
      const goal = await db<Goal>('goal').where({ type }).first();
      expect(goal?.target).toBe(42);
    });

    it('rejects a negative target', async () => {
      const response = await request(app).put(`/goals/${type}`).send({ target: -1 });

      expect(response.status).toBe(400);
      expect(await db('goal').where({ type }).first()).toBeUndefined();
    });
  });
});
