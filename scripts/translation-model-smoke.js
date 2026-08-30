const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const backendRequire = createRequire(
  path.join(__dirname, "..", "travel-app-be", "package.json")
);

const cacheDir =
  process.env.TRANSLATION_SMOKE_CACHE ||
  path.join(os.tmpdir(), "voxtrail-translation-smoke");

async function run() {
  const startedAt = Date.now();
  const transformersEntry = backendRequire.resolve("@huggingface/transformers");
  const { pipeline } = await import(pathToFileURL(transformersEntry).href);
  const translator = await pipeline("translation", "Xenova/opus-mt-en-es", {
    cache_dir: cacheDir,
  });
  const result = await translator("Hello, where is the train station?");
  const translation = result?.[0]?.translation_text?.trim();

  if (!translation) throw new Error("Translation model returned no text");
  console.log(
    JSON.stringify({
      model: "Xenova/opus-mt-en-es",
      translation,
      elapsedMs: Date.now() - startedAt,
    })
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
