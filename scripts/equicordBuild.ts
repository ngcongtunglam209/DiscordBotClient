/* Copyright Elysia © 2025 */

import { spawn } from "child_process";
import { existsSync, renameSync, rmSync } from "fs";
import path from "path";
import process from "process";

function runCommand(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: opts.cwd ?? process.cwd(),
            stdio: "inherit",
            shell: false,
        });
        child.on("error", err => reject(err));
        child.on("close", (code, signal) => {
            if (signal) {
                return reject(new Error(`Command terminated by signal ${signal}`));
            }
            if (code !== 0) {
                return reject(new Error(`Command exited with code ${code}`));
            }
            resolve();
        });
    });
}

async function buildEquicord() {
    const root = process.cwd();
    const equicordDir = path.join(root, "Equicord");
    console.log("➡️  Building Equicord (web) ...");
    await runCommand(
        process.execPath,
        ["--require", "./scripts/suppressExperimentalWarnings.js", "scripts/build/buildWeb.mjs"],
        {
            cwd: equicordDir,
        },
    );
    console.log("✅ Equicord build finished.");
}

function copyExtension() {
    const root = process.cwd();
    const finalFolder = path.resolve(root, "EquicordExtension");
    if (existsSync(finalFolder)) {
        rmSync(finalFolder, { recursive: true });
        console.info("Removed the old Equicord Extension folder:", finalFolder);
    }
    const equicordBuildPath = path.resolve(root, "Equicord", "dist", "browser", "chromium-unpacked");
    renameSync(equicordBuildPath, finalFolder);
    rmSync(path.resolve(root, "Equicord", "dist"), { recursive: true });
    console.info("Moved the newly built Equicord Extension folder to", finalFolder);
}

async function main() {
    try {
        await buildEquicord();
        copyExtension();
        console.log("🎉 All done.");
    } catch (err) {
        console.error("❌ Build failed:", err);
        process.exitCode = 1;
    }
}

main();
