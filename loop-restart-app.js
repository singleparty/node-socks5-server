#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');

const DEFAULT_RESTART_DELAY = 2000;

function printHelp() {
  console.log(`Usage: ciiri-node-loop-restart-app --app <name> --interval <duration> [options]

Options:
  --app <name>            Application name to restart
  --interval <duration>   Restart interval in ms or with suffix s/m/h
                          Examples: 5000, 30s, 5m, 1h
  --restart-delay <ms>    Delay after quitting before relaunching (default: ${DEFAULT_RESTART_DELAY})
  -h, --help              Show this help message`);
}

function parseDuration(value) {
  const match = /^(\d+)(ms|s|m|h)?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid interval: ${value}. Use a number with optional ms, s, m, or h suffix.`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function parseArgs(argv) {
  const options = {
    app: '',
    interval: 0,
    restartDelay: DEFAULT_RESTART_DELAY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '-h' || argument === '--help') {
      printHelp();
      process.exit(0);
    }

    if (argument === '--app') {
      if (!argv[index + 1] || argv[index + 1].startsWith('-')) {
        throw new Error('Missing value for --app.');
      }
      options.app = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === '--interval') {
      if (!argv[index + 1] || argv[index + 1].startsWith('-')) {
        throw new Error('Missing value for --interval.');
      }
      options.interval = parseDuration(argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument === '--restart-delay') {
      if (!argv[index + 1] || argv[index + 1].startsWith('-')) {
        throw new Error('Missing value for --restart-delay.');
      }
      options.restartDelay = parseDuration(argv[index + 1]);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  if (!options.app) {
    throw new Error('Missing required option: --app.');
  }

  if (!options.interval || options.interval <= 0) {
    throw new Error('Missing required option: --interval.');
  }

  return options;
}

function log(message) {
  console.log(`[loop-restart] ${new Date().toISOString()} ${message}`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const message = stderr.trim() || stdout.trim() || `${command} exited with code ${code}`;
      reject(new Error(message));
    });
  });
}

function escapeAppleScriptString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function quitApp(appName) {
  const script = `tell application "${escapeAppleScriptString(appName)}" to quit`;
  await runCommand('osascript', ['-e', script]);
}

async function launchApp(appName) {
  await runCommand('open', ['-a', appName]);
}

async function restartApp(options) {
  log(`restarting ${options.app}`);
  await quitApp(options.app);
  await new Promise(resolve => setTimeout(resolve, options.restartDelay));
  await launchApp(options.app);
  log(`restarted ${options.app}`);
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`[loop-restart] ${error.message}`);
  console.error('Use --help to see available options.');
  process.exit(1);
}

if (process.platform !== 'darwin') {
  console.error('[loop-restart] This command is only supported on macOS.');
  process.exit(1);
}

log(`starting loop for ${options.app} every ${options.interval}ms`);

let shuttingDown = false;
let timer = null;

async function scheduleNext() {
  if (shuttingDown) {
    return;
  }

  timer = setTimeout(async () => {
    try {
      await restartApp(options);
    } catch (error) {
      log(`error: ${error.message}`);
    }

    scheduleNext();
  }, options.interval);
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (timer) {
    clearTimeout(timer);
  }
  log(`received ${signal}, shutting down`);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

scheduleNext();
