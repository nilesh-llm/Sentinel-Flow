require('dotenv/config');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_NAME = 'gemini-2.5-flash';
const REMEDIATION_PROMPT =
  'Rewrite this code to fix security vulnerabilities. ONLY return raw code. No markdown.';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

/**
 * Remove accidental Markdown code fences while preserving the generated source.
 *
 * @param {string} text
 * @returns {string}
 */
function stripMarkdownCodeFences(text) {
  return text
    .replace(/^\s*```(?:[a-zA-Z0-9_-]+)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Send vulnerable source code to Gemini and return the clean remediated file.
 *
 * @param {string} fileContent
 * @param {string|null} previousError
 * @returns {Promise<string>}
 */
async function fixVulnerability(fileContent, previousError = null) {
  try {
    let prompt = REMEDIATION_PROMPT;

    if (previousError) {
      prompt += ` WARNING: Your previous attempt failed with this terminal error: ${previousError}. Fix the code so it resolves this error.`;
    }

    const result = await model.generateContent([
      prompt,
      '\n\nVulnerable file:\n',
      fileContent,
    ]);

    const responseText = result.response.text();
    return stripMarkdownCodeFences(responseText);
  } catch (error) {
    console.error('[AI Service] fixVulnerability failed.', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  fixVulnerability,
};
