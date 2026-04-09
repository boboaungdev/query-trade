import readline from "readline";
import { spawn } from "child_process";

let serverProcess = null;
let isRestarting = false;
let isShuttingDown = false;

const clearTerminal = () => {
  process.stdout.write("\x1Bc");
};

const startServer = () => {
  serverProcess = spawn(process.execPath, ["--watch", "server.js"], {
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

  serverProcess.kill("SIGTERM");
};

const restartServer = () => {
  if (!serverProcess || isRestarting) {
    return;
  }

  isRestarting = true;
  clearTerminal();
  console.log("=> Restarting server...");
  stopServer();
};

const shutdown = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("\n=> Shutting down dev server...");

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
    restartServer();
  }
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

clearTerminal();
console.log("=> Dev runner ready. Press 'r' to clear and restart, Ctrl+C to exit.");
startServer();
