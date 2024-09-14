import process from 'node:process';
import readline from 'node:readline';
import { InternalContext } from '../types';
import { StartServerResult } from './helper';
import { restartDevServer } from './restart';

type shortcutMap = {
  [key: string]: {
    description: string;
    handler: (options: {
      serverResult: StartServerResult;
      rl: readline.Interface;
      context: InternalContext;
    }) => Promise<void> | void;
  };
};

const shortcutMap: shortcutMap = {
  r: {
    description: 'Restart the server',
    handler: async ({ rl }) => {
      rl.close();
      await restartDevServer();
    },
  },
  q: {
    description: 'Quit the server',
    handler: async ({ serverResult, rl }) => {
      const { server } = serverResult;
      try {
        rl.close();
        await server.close();
      } finally {
        process.exit(0);
      }
    },
  },
  o: {
    description: 'Open the first URL in the browser',
    handler: async ({ serverResult }) => {
      const { urls } = serverResult;
      const url = urls[0];
      try {
        const { default: open } = await import('open');
        await open(url);
      } catch (err) {
        console.error(err);
      }
    },
  },
  h: {
    description: 'Show shortcuts',
    handler: () => {
      console.log('Shortcuts:');
      Object.entries(shortcutMap).forEach(([key, { description }]) => {
        console.log(`  ${key}: ${description}`);
      });
    },
  },
  c: {
    description: 'Clear the console',
    handler: () => {
      process.stdout.write('\x1Bc');
    },
  },
};

export function registerShortcuts({
  serverResult,
  context,
}: {
  serverResult: StartServerResult;
  context: InternalContext;
}): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('line', async (input: string) => {
    const shortcut = shortcutMap[input];
    if (shortcut) {
      await shortcut.handler({ serverResult, rl, context });
    }
  });
}
