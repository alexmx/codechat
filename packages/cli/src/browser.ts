import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { promisify } from 'node:util';
import open from 'open';

const exec = promisify(execFile);

interface AppModeCandidate {
  name: string;
  check: () => Promise<boolean>;
  open: (url: string) => Promise<void>;
}

function darwinCandidates(): AppModeCandidate[] {
  return [
    {
      name: 'Google Chrome',
      check: () => access('/Applications/Google Chrome.app').then(() => true, () => false),
      open: (url) => exec('open', ['-na', 'Google Chrome', '--args', `--app=${url}`]).then(() => {}),
    },
    {
      name: 'Microsoft Edge',
      check: () => access('/Applications/Microsoft Edge.app').then(() => true, () => false),
      open: (url) => exec('open', ['-na', 'Microsoft Edge', '--args', `--app=${url}`]).then(() => {}),
    },
    {
      name: 'Chromium',
      check: () => access('/Applications/Chromium.app').then(() => true, () => false),
      open: (url) => exec('open', ['-na', 'Chromium', '--args', `--app=${url}`]).then(() => {}),
    },
  ];
}

function linuxCandidates(): AppModeCandidate[] {
  async function which(cmd: string): Promise<boolean> {
    try {
      await exec('which', [cmd]);
      return true;
    } catch {
      return false;
    }
  }

  return [
    {
      name: 'google-chrome',
      check: () => which('google-chrome'),
      open: (url) => exec('google-chrome', [`--app=${url}`]).then(() => {}),
    },
    {
      name: 'google-chrome-stable',
      check: () => which('google-chrome-stable'),
      open: (url) => exec('google-chrome-stable', [`--app=${url}`]).then(() => {}),
    },
    {
      name: 'chromium',
      check: () => which('chromium'),
      open: (url) => exec('chromium', [`--app=${url}`]).then(() => {}),
    },
    {
      name: 'chromium-browser',
      check: () => which('chromium-browser'),
      open: (url) => exec('chromium-browser', [`--app=${url}`]).then(() => {}),
    },
    {
      name: 'microsoft-edge',
      check: () => which('microsoft-edge'),
      open: (url) => exec('microsoft-edge', [`--app=${url}`]).then(() => {}),
    },
  ];
}

function getCandidates(): AppModeCandidate[] {
  switch (process.platform) {
    case 'darwin':
      return darwinCandidates();
    case 'linux':
      return linuxCandidates();
    default:
      // Windows and others — fall through to regular open
      return [];
  }
}

/**
 * Open a URL in app mode (standalone window, no browser chrome).
 * Tries Chrome/Edge --app mode first, falls back to regular browser.
 */
export async function openAppMode(url: string): Promise<void> {
  const candidates = getCandidates();

  for (const candidate of candidates) {
    if (await candidate.check()) {
      try {
        await candidate.open(url);
        return;
      } catch {
        // This candidate failed, try the next
      }
    }
  }

  // Fallback: regular browser tab
  await open(url);
}
