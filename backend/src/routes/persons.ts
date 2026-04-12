import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { canAddPerson } from '../services/policyEngine';

const router = Router();

const personSchema = z.object({
  name: z.string().min(1).max(100),
  dietary_tag: z.string().min(1).max(50), // Managed by Admin list
  allergies: z.array(z.string()).optional().default([]),
  spice_level: z.enum(['mild', 'medium', 'hot']).optional().default('medium'),
  notes: z.string().max(500).optional(),
});

router.get('/', requireUser, async (req, res) => {
  const persons = await db('persons').where({ user_id: req.userId }).orderBy('id');
  res.json(persons);
});

router.post('/', requireUser, validate(personSchema), async (req, res) => {
  const check = await canAddPerson(req.userId!);
  if (!check.allowed) return res.status(409).json({ error: check.reason });

  const [person] = await db('persons')
    .insert({ ...req.body, user_id: req.userId })
    .returning('*');

  // Create streak entry for new person
  await db('person_streaks')
    .insert({ person_id: person.id, user_id: req.userId })
    .onConflict('person_id').ignore();

  res.status(201).json(person);
});

router.patch('/:id', requireUser, validate(personSchema.partial()), async (req, res) => {
  const person = await db('persons').where({ id: req.params.id, user_id: req.userId }).first();
  if (!person) return res.status(404).json({ error: 'Person not found' });

  const [updated] = await db('persons')
    .where({ id: req.params.id })
    .update(req.body)
    .returning('*');

  // Respond immediately — do not await event emission (prevents Render cold-start hangs)
  res.json(updated);

  import('../jobs/events').then(({ emitEvent, DomainEvent }) => {
    emitEvent(DomainEvent.PERSON_UPDATED, { person_id: updated.id }).catch(err => {
      console.error('[person.updated] Event manifestation drift:', err);
    });
  }).catch(err => {
    console.error('[person.updated] Event module import failed:', err);
  });
});

router.delete('/:id', requireUser, async (req, res) => {
  const person = await db('persons').where({ id: req.params.id, user_id: req.userId }).first();
  if (!person) return res.status(404).json({ error: 'Person not found' });

  const inProgressSub = await db('subscriptions')
    .where({ person_id: req.params.id })
    .whereIn('state', ['draft', 'pending_payment', 'failed_payment', 'active'])
    .first();
  if (inProgressSub) {
    return res.status(409).json({
      error: 'Cannot delete person with an active or in-progress subscription'
    });
  }

  await db('persons').where({ id: req.params.id }).delete();
  res.status(204).send();
});

export default router;
