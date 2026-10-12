/* Copyright Elysia © 2025 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const cloneDir = path.join(".", "Equicord");
const userPluginDir = path.join(cloneDir, "src", "userplugins", "botClient");

function runCommand(command: string, cwd?: string) {
    execSync(command, {
        stdio: "inherit",
        cwd,
    });
}

(async () => {
    // Clone or update Equicord
    if (!fs.existsSync(cloneDir)) {
        console.log("> Cloning Equicord/Equicord...");
        runCommand(`git clone --depth 1 https://github.com/Equicord/Equicord.git ${cloneDir}`);
        console.log("> Equicord clone complete.");
    } else {
        console.log("> Equicord already exists, updating main branch...");
        try {
            runCommand("git fetch origin main", cloneDir);
            runCommand("git reset --hard origin/main", cloneDir);
            console.log("> Equicord updated to latest main.");
        } catch (err) {
            console.error("> Failed to update Equicord:", err);
        }
    }

    // Clone user plugin only if not exists
    if (!fs.existsSync(userPluginDir)) {
        console.log("> Cloning aiko-chan-ai/VencordDBCPlugin...");
        runCommand(`git clone --depth 1 https://github.com/aiko-chan-ai/VencordDBCPlugin.git ${userPluginDir}`);
        console.log("> VencordDBCPlugin clone complete.");
    } else {
        console.log("> VencordDBCPlugin already exists, skipping clone.");
    }

    // Install dependencies with the pnpm version Equicord pins (e.g. "pnpm@12.8.1+sha512...")
    const { packageManager } = JSON.parse(fs.readFileSync(path.join(cloneDir, "package.json"), "utf-8"));
    const pnpm = packageManager.split("+")[0];
    console.log(`> Installing Equicord dependencies with ${pnpm}...`);
    runCommand(`npx -y ${pnpm} install --frozen-lockfile`, cloneDir);
    console.log("> Equicord dependencies installed.");
})();
