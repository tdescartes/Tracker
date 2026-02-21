const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function exists(p) {
  return fs.existsSync(p);
}

function fixReactNativeScreens(root) {
  const pkgPath = path.join(
    root,
    "node_modules",
    "react-native-screens",
    "package.json",
  );
  if (!exists(pkgPath)) return { changed: false, reason: "not-installed" };

  const pkgDir = path.dirname(pkgPath);
  const srcIndexTs = path.join(pkgDir, "src", "index.ts");
  const srcIndexTsx = path.join(pkgDir, "src", "index.tsx");
  const srcIndexJs = path.join(pkgDir, "src", "index.js");
  const fallback = path.join(pkgDir, "lib", "module", "index.js");

  if (exists(srcIndexTs) || exists(srcIndexTsx) || exists(srcIndexJs)) {
    return { changed: false, reason: "src-present" };
  }

  if (!exists(fallback)) {
    return { changed: false, reason: "fallback-missing" };
  }

  const pkg = readJson(pkgPath);
  let changed = false;

  if (pkg["react-native"] !== "lib/module/index") {
    pkg["react-native"] = "lib/module/index";
    changed = true;
  }

  if (pkg["source"] !== "lib/module/index") {
    pkg["source"] = "lib/module/index";
    changed = true;
  }

  if (changed) writeJson(pkgPath, pkg);
  return { changed, reason: changed ? "patched" : "already-patched" };
}

function fixExpoModulesCore(root) {
  const pkgPath = path.join(
    root,
    "node_modules",
    "expo-modules-core",
    "package.json",
  );
  if (!exists(pkgPath)) return { changed: false, reason: "not-installed" };

  const pkgDir = path.dirname(pkgPath);
  const srcIndexTs = path.join(pkgDir, "src", "index.ts");
  const indexJs = path.join(pkgDir, "index.js");

  if (exists(srcIndexTs)) {
    return { changed: false, reason: "src-present" };
  }

  if (!exists(indexJs)) {
    return { changed: false, reason: "fallback-missing" };
  }

  const pkg = readJson(pkgPath);
  let changed = false;

  if (pkg.main !== "index.js") {
    pkg.main = "index.js";
    changed = true;
  }

  if (
    pkg.exports &&
    pkg.exports["."] &&
    pkg.exports["."].default !== "./index.js"
  ) {
    pkg.exports["."].default = "./index.js";
    changed = true;
  }

  if (changed) writeJson(pkgPath, pkg);
  return { changed, reason: changed ? "patched" : "already-patched" };
}

function main() {
  const root = process.cwd();
  const screens = fixReactNativeScreens(root);
  const expoModulesCore = fixExpoModulesCore(root);

  console.log("[postinstall-fix] react-native-screens:", screens.reason);
  console.log("[postinstall-fix] expo-modules-core:", expoModulesCore.reason);
}

main();
