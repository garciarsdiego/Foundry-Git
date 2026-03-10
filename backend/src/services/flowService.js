import { getDb } from '../db/index.js';
import { createRun, dispatchRun } from './executionService.js';

export async function dispatchFlowRun(flowRunId) {
  const db = getDb();
  const flowRun = db.prepare('SELECT * FROM flow_runs WHERE id = ?').get(flowRunId);
  if (!flowRun) throw new Error(`Flow run ${flowRunId} not found`);

  const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(flowRun.flow_id);
  if (!flow) throw new Error(`Flow ${flowRun.flow_id} not found`);

  const steps = db.prepare(
    'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY position ASC'
  ).all(flowRun.flow_id);

  db.prepare(`UPDATE flow_runs SET status = 'running', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(flowRunId);

  try {
    for (const step of steps) {
      db.prepare(`UPDATE flow_runs SET current_step_id = ?, updated_at = datetime('now') WHERE id = ?`).run(step.id, flowRunId);

      if (step.step_type === 'agent' && step.agent_id) {
        if (!flowRun.card_id) {
          console.warn(`Flow run ${flowRunId} step "${step.name}" (${step.id}): no card_id — agent step requires a card for context. Skipping.`);
          continue;
        }
        // Create and dispatch a run for this step
        const run = await createRun(flowRun.card_id, step.agent_id, {});
        await dispatchRun(run.id);

        // Check if the run failed
        const completedRun = db.prepare('SELECT * FROM runs WHERE id = ?').get(run.id);
        if (completedRun?.status === 'failed') {
          throw new Error(`Step "${step.name}" failed: ${completedRun.error_message}`);
        }
      } else if (step.step_type === 'parallel' && step.agent_id) {
        if (!flowRun.card_id) {
          console.warn(`Flow run ${flowRunId} step "${step.name}" (${step.id}): no card_id — parallel step requires a card. Skipping.`);
          continue;
        }
        // Dispatch concurrently (fire-and-forget within the flow run; errors are logged but don't block flow)
        const run = await createRun(flowRun.card_id, step.agent_id, {});
        dispatchRun(run.id).catch(err => console.error(`Flow ${flowRunId} parallel step "${step.name}" error: ${err.message}`));
      }
      // condition steps are informational only — used for documentation/routing hints
    }

    db.prepare(`
      UPDATE flow_runs SET status = 'success', finished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(flowRunId);
  } catch (err) {
    db.prepare(`
      UPDATE flow_runs SET status = 'failed', finished_at = datetime('now'), error_message = ?, updated_at = datetime('now') WHERE id = ?
    `).run(err.message, flowRunId);
  }
}
