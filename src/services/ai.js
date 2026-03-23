require('dotenv/config');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_NAME = 'gemini-2.5-flash';
const REMEDIATION_PROMPT =
  'Rewrite this code to fix any security vulnerabilities (like SQL injection). Return ONLY the raw, fixed code. No markdown, no backticks, no explanations.';

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
 * @returns {Promise<string>}
 */
async function fixVulnerability(fileContent) {
  try {
    const result = await model.generateContent([
      REMEDIATION_PROMPT,
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
