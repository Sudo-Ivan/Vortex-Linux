import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

const ROOT = import.meta.dirname;
const DIST = join(ROOT, "dist");
const OUTPUT = join(DIST, "installer-sandbox");

function hasLibseccomp() {
  const result = spawnSync("pkg-config", ["--exists", "libseccomp"], { stdio: "ignore" });
  return result.status === 0;
}

function compile() {
  if (process.platform !== "linux") {
    console.log("Skipping installer-sandbox build on non-Linux platform.");
    process.exit(0);
  }

  mkdirSync(DIST, { recursive: true });

  const sources = [
    join(ROOT, "installer-sandbox.c"),
    join(ROOT, "landlock_sandbox.c"),
    join(ROOT, "seccomp_sandbox.c"),
  ];

  const args = ["-O2", "-Wall", "-Wextra", "-o", OUTPUT, ...sources];

  if (hasLibseccomp()) {
    const cflags = execFileSync("pkg-config", ["--cflags", "libseccomp"], { encoding: "utf8" })
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const libs = execFileSync("pkg-config", ["--libs", "libseccomp"], { encoding: "utf8" })
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    args.push("-DVORTEX_HAVE_LIBSECCOMP", ...cflags, ...libs);
  }

  execFileSync("cc", args, { stdio: "inherit" });
}

compile();

if (process.platform === "linux" && existsSync(OUTPUT)) {
  try {
    execFileSync(OUTPUT, ["--probe"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
    console.log("installer-sandbox probe succeeded");
  } catch (err) {
    console.warn(
      "installer-sandbox probe failed, binary may not work on this kernel:",
      err.message,
    );
  }
}
