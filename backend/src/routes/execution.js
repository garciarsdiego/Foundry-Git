import { Router } from 'express';
import { createRun, dispatchRun } from '../services/executionService.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { card_id, agent_id, options } = req.body;
    if (!card_id || !agent_id) {
      return res.status(400).json({ error: 'card_id and agent_id are required' });
    }
    const run = await createRun(card_id, agent_id, options || {});
    // Dispatch asynchronously
    dispatchRun(run.id).catch(err => console.error('Dispatch error:', err));
    res.status(201).json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
