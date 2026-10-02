const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "travel-app-be");
const projectId = "demo-voxtrail";
const localEnvPath = path.join(backendDir, ".env.local");
const previousLocalEnv = fs.existsSync(localEnvPath)
  ? fs.readFileSync(localEnvPath)
  : null;
// apiV2 binds provider keys with defineSecret (ADR-001). The emulator reads
// those from .secret.local, and a secret name must not also appear in .env.
const localSecretPath = path.join(backendDir, ".secret.local");
const previousLocalSecrets = fs.existsSync(localSecretPath)
  ? fs.readFileSync(localSecretPath)
  : null;
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
  // Firebase sanitizes the parent environment during function discovery.
  // Its emulator-only dotenv file supplies isolated values without changing
  // a developer's .env or allowing real provider credentials into this run.
  fs.writeFileSync(localEnvPath, [
    "CORS_ALLOWED_ORIGINS=http://127.0.0.1:5500",
    "",
  ].join("\n"), { mode: 0o600 });
  fs.writeFileSync(localSecretPath, [
    "REQUEST_SIGNING_SECRET=emulator-signing-secret-only",
    'GOOGLE_PLACES_API_KEY=""',
    'OPENROUTER_API_KEY=""',
    "",
  ].join("\n"), { mode: 0o600 });
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
        NODE_ENV: "production",
        REQUEST_SIGNING_SECRET: "emulator-signing-secret-only",
        CORS_ALLOWED_ORIGINS: "http://127.0.0.1:5500",
        GOOGLE_PLACES_API_KEY: "",
        OPENROUTER_API_KEY: "",
      },
      stdio: "inherit",
    },
  );
} finally {
  fs.rmSync(generatedConfigPath, { force: true });
  if (previousLocalEnv !== null) fs.writeFileSync(localEnvPath, previousLocalEnv);
  else fs.rmSync(localEnvPath, { force: true });
  if (previousLocalSecrets !== null) {
    fs.writeFileSync(localSecretPath, previousLocalSecrets);
  } else {
    fs.rmSync(localSecretPath, { force: true });
  }
}

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
