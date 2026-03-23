const { Gitlab } = require('@gitbeaker/rest');

const DEFAULT_GITLAB_HOST = process.env.GITLAB_HOST || 'https://gitlab.com';

/**
 * Centralized GitLab API client for the agent.
 * Keeping client creation in one module makes it easier to mock in tests
 * and keeps all authentication concerns in one place.
 */
const api = new Gitlab({
  host: DEFAULT_GITLAB_HOST,
  token: process.env.GITLAB_TOKEN,
});

/**
 * Log GitLab API errors with enough context to debug hackathon demos quickly.
 *
 * @param {string} operation
 * @param {Error} error
 * @param {object} metadata
 */
function logGitLabError(operation, error, metadata = {}) {
  console.error(`[GitLab Service] ${operation} failed.`, {
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    responseBody: error.response?.body,
    responseStatus: error.response?.status,
    metadata,
  });
}

/**
 * Create a Merge Request from the supplied branch into main and return its URL.
 *
 * @param {string} branchName
 * @param {string} title
 * @param {string} description
 * @returns {Promise<string>}
 */
async function createGitLabMR(branchName, title, description) {
  const projectId = process.env.GITLAB_PROJECT_ID;

  if (!process.env.GITLAB_TOKEN) {
    throw new Error('GITLAB_TOKEN is required to create a Merge Request.');
  }

  if (!projectId) {
    throw new Error('GITLAB_PROJECT_ID is required to create a Merge Request.');
  }

  try {
    const mergeRequest = await api.MergeRequests.create(
      projectId,
      branchName,
      'main',
      title,
      {
        description,
        removeSourceBranch: true,
      }
    );

    return mergeRequest.webUrl || mergeRequest.web_url;
  } catch (error) {
    logGitLabError('createGitLabMR', error, {
      projectId,
      branchName,
      title,
    });
    throw error;
  }
}

/**
 * Fetch the raw text content of a file from a GitLab repository.
 *
 * @param {string|number} projectId
 * @param {string} filePath
 * @param {string} branch
 * @returns {Promise<string>}
 */
async function getFileContent(projectId, filePath, branch) {
  try {
    const rawFile = await api.RepositoryFiles.showRaw(projectId, filePath, branch);

    if (Buffer.isBuffer(rawFile)) {
      return rawFile.toString('utf8');
    }

    return String(rawFile);
  } catch (error) {
    logGitLabError('getFileContent', error, { projectId, filePath, branch });
    throw error;
  }
}

/**
 * Create a feature branch that the agent can safely modify.
 *
 * @param {string|number} projectId
 * @param {string} newBranchName
 * @param {string} refBranch
 * @returns {Promise<object>}
 */
async function createBranch(projectId, newBranchName, refBranch = 'main') {
  try {
    return await api.Branches.create(projectId, newBranchName, refBranch);
  } catch (error) {
    logGitLabError('createBranch', error, {
      projectId,
      newBranchName,
      refBranch,
    });
    throw error;
  }
}

/**
 * Commit updated code to a branch and immediately open a Merge Request to main.
 * If newContent is omitted, the function assumes the branch was already pushed
 * through git and only creates the Merge Request.
 *
 * @param {string|number} projectId
 * @param {string} branchName
 * @param {string} filePath
 * @param {string} newContent
 * @param {string} commitMessage
 * @param {string} mrTitle
 * @param {string} mrDescription
 * @returns {Promise<{commit: object, mergeRequest: object}>}
 */
async function commitAndCreateMR(
  projectId,
  branchName,
  filePath,
  newContent,
  commitMessage,
  mrTitle,
  mrDescription
) {
  try {
    let commit = null;

    if (typeof newContent === 'string') {
      commit = await api.Commits.create(projectId, branchName, commitMessage, [
        {
          action: 'update',
          filePath,
          content: newContent,
        },
      ]);
    }

    const mergeRequest = await api.MergeRequests.create(
      projectId,
      branchName,
      'main',
      mrTitle,
      {
        description: mrDescription,
        removeSourceBranch: true,
      }
    );

    return { commit, mergeRequest };
  } catch (error) {
    logGitLabError('commitAndCreateMR', error, {
      projectId,
      branchName,
      filePath,
      commitMessage,
      mrTitle,
    });
    throw error;
  }
}

module.exports = {
  createGitLabMR,
  getFileContent,
  createBranch,
  commitAndCreateMR,
};
