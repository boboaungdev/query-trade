import fs from "fs";
import path from "path";
import readline from "readline";
import { spawn } from "child_process";

let serverProcess = null;
let isRestarting = false;
let isShuttingDown = false;
let restartTimeout = null;
let pendingRestartReason = null;

const watchTargets = [
  "server.js",
  "app.js",
  "routes",
  "controllers",
  "middlewares",
  "services",
  "utils",
  "models",
  "schemas",
  "configs",
  "constants",
  "data",
  "views",
  "api",
];

const watchers = [];

const clearTerminal = () => {
  process.stdout.write("\x1Bc");
};

const getTargetPath = (target) => path.resolve(process.cwd(), target);

const closeWatchers = () => {
  while (watchers.length > 0) {
    const watcher = watchers.pop();

    try {
      watcher?.close();
    } catch {
      // Ignore watcher cleanup errors during shutdown/restart.
    }
  }
};

const startWatchers = () => {
  closeWatchers();

  for (const target of watchTargets) {
    const targetPath = getTargetPath(target);

    if (!fs.existsSync(targetPath)) {
      continue;
    }

    const stats = fs.statSync(targetPath);
    const watcher = fs.watch(
      targetPath,
      { recursive: stats.isDirectory() },
      (_, filename) => {
        if (!filename) {
          scheduleRestart(`change in ${target}`);
          return;
        }

        const normalizedName = String(filename).replaceAll("\\", "/");

        if (normalizedName.includes("node_modules")) {
          return;
        }

        scheduleRestart(`${target}/${normalizedName}`);
      },
    );

    watcher.on("error", (error) => {
      console.error(`=> Watch error on ${target}:`, error.message);
    });

    watchers.push(watcher);
  }
};

const startServer = () => {
  serverProcess = spawn(process.execPath, ["server.js"], {
    stdio: "inherit",
    env: process.env,
  });

  serverProcess.on("exit", (code, signal) => {
    serverProcess = null;

    if (isShuttingDown) {
      process.exit(code ?? (signal ? 0 : 1));
    }

    if (isRestarting) {
      isRestarting = false;
      startServer();
    }
  });
};

const stopServer = () => {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill();
};

const restartServer = (reason = "manual restart") => {
  if (isShuttingDown) {
    return;
  }

  pendingRestartReason = reason;

  if (isRestarting) {
    return;
  }

  isRestarting = true;
  clearTerminal();
  console.log(`=> Restarting server (${pendingRestartReason})...`);
  pendingRestartReason = null;
  stopServer();

  if (!serverProcess) {
    isRestarting = false;
    startServer();
  }
};

const scheduleRestart = (reason) => {
  pendingRestartReason = reason;

  if (restartTimeout) {
    clearTimeout(restartTimeout);
  }

  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    restartServer(pendingRestartReason ?? "file change");
  }, 150);
};

const shutdown = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("\n=> Shutting down dev server...");

  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  closeWatchers();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  stopServer();

  if (!serverProcess) {
    process.exit(0);
  }
};

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (_, key) => {
  if (!key) {
    return;
  }

  if (key.ctrl && key.name === "c") {
    shutdown();
    return;
  }

  if (key.name === "r") {
    restartServer("manual restart");
  }
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

clearTerminal();
console.log(
  "=> Dev runner ready. Watching server files. Press 'r' to clear and restart, Ctrl+C to exit.",
);
startWatchers();
startServer();
