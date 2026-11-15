const { spawn } = require('child_process');
const net = require('net');

const PORT = parseInt(process.env.OMNIROUTE_PORT || '20128', 10);
const HOST = process.env.OMNIROUTE_HOST || '127.0.0.1';

function isPortInUse(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function start() {
  const inUse = await isPortInUse(PORT, HOST);

  if (inUse) {
    console.log(`[OmniRoute] Port ${PORT} is already in use by an active OmniRoute server. Keeping standby monitor.`);
    // Keep process alive so Turborepo task remains persistent
    setInterval(async () => {
      const stillInUse = await isPortInUse(PORT, HOST);
      if (!stillInUse) {
        console.log(`[OmniRoute] Server on port ${PORT} stopped. Restarting...`);
        launchOmniRoute();
      }
    }, 5000);
    return;
  }

  launchOmniRoute();
}

function launchOmniRoute() {
  console.log(`[OmniRoute] Launching OmniRoute server on port ${PORT}...`);

  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'omniroute.cmd' : 'omniroute';
  const args = ['serve', '--port', PORT.toString(), '--no-open', '--no-tray'];

  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('error', (err) => {
    console.error(`[OmniRoute] Failed to start with "${cmd}", falling back to "npx omniroute":`, err.message);
    const fallback = spawn('npx', ['omniroute', ...args], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    fallback.on('exit', (code) => {
      console.log(`[OmniRoute] Process exited with code ${code}`);
    });
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[OmniRoute] Server exited with code ${code}`);
    }
  });

  const cleanup = () => {
    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch (_) {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start();
