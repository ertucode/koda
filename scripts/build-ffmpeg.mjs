// scripts/build-ffmpeg.mjs
import { download } from "./utils/download.mjs";
import { exec as _exec } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";
import path from "path";
import os from "os";

const exec = promisify(_exec);

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT = path.join(ROOT, "vendor-bin");
await fs.mkdir(OUT, { recursive: true });

// Evermeet removed its download API. Resolve the current release through the
// supported info API instead.
const FFMPEG_INFO_URL = "https://evermeet.cx/ffmpeg/info/ffmpeg/release";

const infoResponse = await fetch(FFMPEG_INFO_URL);
if (!infoResponse.ok) {
  throw new Error(
    `HTTP ${infoResponse.status} while fetching ${FFMPEG_INFO_URL}`,
  );
}

const ffmpegInfo = await infoResponse.json();
const FFMPEG_URL = ffmpegInfo.download?.zip?.url;
if (typeof FFMPEG_URL !== "string") {
  throw new Error("FFmpeg info response did not contain a ZIP download URL");
}

console.log("→ Downloading ffmpeg...");
const tmpFile = path.join(os.tmpdir(), "ffmpeg.zip");
await download(FFMPEG_URL, tmpFile);

console.log("→ Extracting...");
await exec(`unzip -o ${tmpFile} -d ${OUT}`);

// Make sure the binary is executable
await exec(`chmod +x ${path.join(OUT, "ffmpeg")}`);

console.log("✔ ffmpeg installed into vendor-bin/ffmpeg");
