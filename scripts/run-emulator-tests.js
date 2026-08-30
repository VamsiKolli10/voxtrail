const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "travel-app-be");
const projectId = "demo-voxtrail";
const generatedConfigPath = path.join(
  backendDir,
  ".firebase-emulator.generated.json"
);
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(backendDir, "firebase.json"), "utf8")
);
firebaseConfig.firestore.rules = "firestore.emulator.rules";
fs.writeFileSync(generatedConfigPath, `${JSON.stringify(firebaseConfig, null, 2)}\n`);

let result;
try {
  result = spawnSync(
    "firebase",
    [
      "emulators:exec",
      "--config",
      generatedConfigPath,
      "--project",
      projectId,
      "--only",
      "auth,firestore,functions,hosting",
      "node ../scripts/emulator-smoke.js",
    ],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        TRANSLATION_WARM_PAIRS: "",
      },
      stdio: "inherit",
    },
  );
} finally {
  fs.rmSync(generatedConfigPath, { force: true });
}

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
