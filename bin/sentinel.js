#!/usr/bin/env node

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const { Command } = require('commander');
const simpleGit = require('simple-git');
const { fixVulnerability } = require('../src/services/ai');
const { createGitLabMR } = require('../src/services/gitlab');

const git = simpleGit();

async function main() {
  const chalkModule = await import('chalk');
  const chalk = chalkModule.default;
  const program = new Command();

  /**
   * Print a polished CLI error without dumping a raw stack trace.
   *
   * @param {Error} error
   */
  function printCliError(error) {
    console.error(chalk.red(`✖ ${error.message}`));
  }

  /**
   * Quote a file path so it can be safely passed to execSync.
   *
   * @param {string} value
   * @returns {string}
   */
  function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }

  /**
   * Validate that Sentinel Flow is running inside a usable git repository
   * before it rewrites any local source files.
   */
  async function ensureGitReady() {
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      throw new Error(
        'This directory is not a git repository. Run `git init` and add an `origin` remote before using `sentinel heal`.'
      );
    }

    const remotes = await git.getRemotes(true);
    const hasOrigin = remotes.some((remote) => remote.name === 'origin');

    if (!hasOrigin) {
      throw new Error(
        'No `origin` remote was found. Add your GitLab remote with `git remote add origin <repo-url>` before using `sentinel heal`.'
      );
    }
  }

  program
    .name('sentinel')
    .description('Sentinel Flow CLI for autonomous security remediation')
    .version('1.0.0');

  program
    .command('heal <file>')
    .description('Autonomously fix vulnerabilities in a local file and push an MR to GitLab')
    .action(async (file) => {
      try {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is required to run autonomous remediation.');
        }

        if (!process.env.GITLAB_PROJECT_ID || !process.env.GITLAB_TOKEN) {
          throw new Error('GITLAB_PROJECT_ID and GITLAB_TOKEN are required to open a Merge Request.');
        }

        if (!fs.existsSync(file)) {
          throw new Error(`File not found: ${file}`);
        }

        await ensureGitReady();

        console.log(chalk.blue('🔍 Scanning local file: ' + file));

        const originalCode = fs.readFileSync(file, 'utf8');
        let currentCode = originalCode;
        let lastError = null;
        let attempt = 1;
        const MAX_ATTEMPTS = 3;
        let verifiedCode = null;

        while (attempt <= MAX_ATTEMPTS) {
          console.log(chalk.blue(`🧠 Generating secure patch (Attempt ${attempt}/${MAX_ATTEMPTS})...`));

          const fixedCode = await fixVulnerability(currentCode, lastError);
          fs.writeFileSync(file, fixedCode, 'utf8');

          try {
            console.log(chalk.blue('🧪 Verifying generated code locally with node -c...'));
            execSync(`node -c ${shellQuote(file)}`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Code verified locally. No syntax errors.'));
            console.log(chalk.green('✨ Local file rewritten securely.'));
            verifiedCode = fixedCode;
            break;
          } catch (error) {
            lastError = error.message;
            currentCode = fixedCode;
            console.error(
              chalk.red(
                '⚠️ AI introduced a syntax error. Initiating self-healing loop (Attempt ' + attempt + ')...'
              )
            );

            if (attempt === MAX_ATTEMPTS) {
              fs.writeFileSync(file, originalCode, 'utf8');
              console.error(
                chalk.bgRed.white(
                  ' FATAL: Sentinel Flow could not produce syntactically valid code after 3 attempts. Aborting without pushing to GitLab. '
                )
              );
              process.exit(1);
            }
          }

          attempt += 1;
        }

        if (!verifiedCode) {
          fs.writeFileSync(file, originalCode, 'utf8');
          process.exit(1);
        }

        const branchName = 'sentinel-heal-' + Date.now();

        await git.checkoutLocalBranch(branchName);
        await git.add(file);
        await git.commit('Auto-healed vulnerability');
        await git.push(['-u', 'origin', branchName]);

        console.log(chalk.blue('🚀 Code pushed to GitLab. Opening Merge Request...'));

        const mrUrl = await createGitLabMR(
          branchName,
          '🚨 Auto-Remediation: Security Patch',
          'Sentinel Flow autonomously fixed a vulnerability.'
        );

        console.log(chalk.bgGreen.black(' ✅ SUCCESS: MR Created at ' + mrUrl));
      } catch (error) {
        printCliError(error);
        process.exitCode = 1;
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  import('chalk').then(({ default: chalk }) => {
    console.error(chalk.red(`✖ ${error.message}`));
    process.exit(1);
  });
});
