// Точка входа для хостинга — по образцу проекта paradox-agent.
//
// Панель Timeweb под выбранный «тип приложения» подставляет СВОЮ команду
// запуска: чаще `node index.js`, иногда `npm start`. Сюда ведут обе дороги
// (см. package.json). Своей логики здесь нет: файл только следит, чтобы
// приложение в web/ было собрано, и запускает `next start`.
//
// Если платформа пропустила команду сборки — дособираем прямо здесь, иначе
// `next start` падает с «Could not find a production build».
const { spawnSync, spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const webDir = __dirname; // этот файл лежит прямо в web/
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args) {
  const r = spawnSync(npm, args, { cwd: webDir, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(path.join(webDir, "node_modules", "next"))) {
  console.log("[start] зависимости web/ не установлены — ставлю");
  run(["ci"]);
}
if (!existsSync(path.join(webDir, ".next", "BUILD_ID"))) {
  console.log("[start] production-сборки нет — собираю");
  run(["run", "build"]);
}

const child = spawn(npm, ["start"], { cwd: webDir, stdio: "inherit", env: process.env });
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => child.kill(sig));
