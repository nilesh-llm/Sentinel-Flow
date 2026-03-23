require('dotenv').config();

const express = require('express');
const { fixVulnerability } = require('./services/ai');
const {
  getFileContent,
  createBranch,
  commitAndCreateMR,
} = require('./services/gitlab');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

/**
 * Basic health endpoint so judges can quickly confirm the service is alive.
 */
app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

/**
 * GitLab Duo Agent webhook entrypoint.
 *
 * This route accepts live GitLab webhooks and always acknowledges them with
 * a 200 response so GitLab knows the receiver is alive. Remediation only runs
 * for issue events that look like vulnerability tickets.
 */
app.post('/webhook/vulnerability', async (request, response) => {
  const payload = request.body;
  const projectId = payload?.project?.id || process.env.GITLAB_PROJECT_ID;
  const branch = payload?.project?.default_branch || 'main';
  const action = payload?.object_attributes?.action;
  const title = payload?.object_attributes?.title || '';
  const acceptedActions = new Set(['open', 'opened', 'update']);

  console.log(
    '📥 Incoming Webhook | Kind:',
    payload?.object_kind,
    '| Action:',
    payload?.object_attributes?.action
  );

  try {
    if (!projectId) {
      console.error('[Webhook] Missing project ID in payload and environment.');
    } else if (payload?.object_kind === 'issue' && acceptedActions.has(action)) {
      if (title.toUpperCase().includes('VULNERABILITY')) {
        const filePath = (payload?.object_attributes?.description || '').trim();

        if (!filePath) {
          console.error('[Webhook] Vulnerability issue description was empty.');
        } else {
          console.log(`🚨 Target Acquired! File: ${filePath}. Waking up Sentinel Flow...`);

          const oldCode = await getFileContent(projectId, filePath, branch);

          console.log('🧠 Passing code to Sentinel Flow AI for remediation...');
          const newCode = await fixVulnerability(oldCode);

          const newBranch = `auto-remediate-${Date.now()}`;

          console.log(`🌿 Creating branch ${newBranch} and pushing fix...`);
          await createBranch(projectId, newBranch, branch);

          await commitAndCreateMR(
            projectId,
            newBranch,
            filePath,
            newCode,
            'fix: resolved critical security vulnerability',
            '🚨 Auto-Remediation: Security Vulnerability Patched',
            'Sentinel Flow detected a vulnerability in this file and autonomously generated this patch. Please review and merge.'
          );

          console.log('✅ Merge Request successfully opened on GitLab!');
        }
      } else {
        console.log("⚠️ Issue ignored (Title does not contain 'VULNERABILITY').");
      }
    } else {
      console.log('[Webhook] Event ignored because it did not match the accepted issue criteria.');
    }
  } catch (error) {
    console.error('[Webhook] Autonomous remediation failed.', {
      message: error.message,
      filePath: payload?.object_attributes?.description?.trim(),
      branch,
      projectId,
    });
  }

  return response.status(200).send('Received');
});

app.listen(port, () => {
  console.log(`Sentinel Flow server listening on port ${port}`);
});
