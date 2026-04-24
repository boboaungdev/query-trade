import readline from "readline";
import { spawn } from "child_process";

let serverProcess = null;
let restarting = false;

const clearTerminal = () => {
  process.stdout.write("\x1Bc");
};

const startServer = () => {
  serverProcess = spawn(process.execPath, ["--watch", "server.js"], {
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });

  serverProcess.on("exit", (code, signal) => {
    serverProcess = null;

    if (restarting) {
      restarting = false;
      startServer();
      return;
    }

    process.exit(code ?? (signal ? 0 : 1));
  });
};

const restartServer = () => {
  clearTerminal();
  console.log("=> Restarting server...");

  if (!serverProcess) {
    startServer();
    return;
  }

  restarting = true;
  serverProcess.kill();
};

const shutdown = () => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  serverProcess?.kill();
};

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (_, key) => {
  if (key?.ctrl && key.name === "c") {
    shutdown();
    return;
  }

  if (key?.name === "r") {
    restartServer();
  }
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

clearTerminal();
console.log(
  "=> Dev runner ready. Node is watching. Press 'r' to clear and restart.",
);
startServer();
