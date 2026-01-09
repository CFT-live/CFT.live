import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const run = () => {
  try {
    // Directory containing language folders
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const messagesDir = path.join(__dirname);
    const enDir = path.join(messagesDir, "en");

    // Get all language folders (excluding 'en' and non-directories)
    const languages = fs
      .readdirSync(messagesDir)
      .filter(
        (f) =>
          fs.statSync(path.join(messagesDir, f)).isDirectory() && f !== "en"
      );

    // Get all translation files in English folder
    const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith(".json"));

    function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      let keys: string[] = [];
      for (const key in obj) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          keys = keys.concat(
            getAllKeys(value as Record<string, unknown>, fullKey)
          );
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const missing: { lang: string; file: string; key: string }[] = [];

    for (const file of enFiles) {
      const enPath = path.join(enDir, file);
      const enJson = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      const enKeys = getAllKeys(enJson);

      for (const lang of languages) {
        const langPath = path.join(messagesDir, lang, file);
        if (!fs.existsSync(langPath)) {
          for (const key of enKeys) {
            missing.push({ lang, file, key });
          }
          continue;
        }
        console.log(`Checking ${lang}/${langPath}...`);
        const langJson = JSON.parse(fs.readFileSync(langPath, "utf-8"));
        const langKeys = getAllKeys(langJson);
        for (const key of enKeys) {
          if (!langKeys.includes(key)) {
            missing.push({ lang, file, key });
          }
        }
      }
    }

    if (missing.length === 0) {
      console.log("All translation keys are present in every language.");
    } else {
      for (const m of missing) {
        console.log(`[${m.lang}] ${m.file}: missing key '${m.key}'`);
      }
      process.exitCode = 0;
    }
  } catch (error) {
    console.error("Error reading translation files:", error);
    process.exit(1);
  }
};
run();
