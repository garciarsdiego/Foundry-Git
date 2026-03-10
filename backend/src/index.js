import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getDb } from './db/index.js';

import workspacesRouter from './routes/workspaces.js';
import projectsRouter from './routes/projects.js';
import boardsRouter from './routes/boards.js';
import cardsRouter from './routes/cards.js';
import agentsRouter from './routes/agents.js';
import teamsRouter from './routes/teams.js';
import runtimesRouter from './routes/runtimes.js';
import providersRouter from './routes/providers.js';
import runsRouter from './routes/runs.js';
import githubRouter from './routes/github.js';
import executionRouter from './routes/execution.js';
import settingsRouter from './routes/settings.js';
import flowsRouter from './routes/flows.js';
import chatRouter from './routes/chat.js';
import skillsRouter from './routes/skills.js';
import mcpRouter from './routes/mcp.js';

const app = express();
const PORT = process.env.PORT || 3001;

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

// Initialize DB on startup
getDb();

// Routes
app.use('/api/workspaces', workspacesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/runtimes', runtimesRouter);
app.use('/api/providers', providersRouter);
app.use('/api/runs', runsRouter);
app.use('/api/github', githubRouter);
app.use('/api/execute', executionRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/mcp', mcpRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Foundry backend running on http://localhost:${PORT}`);
});

export default app;
