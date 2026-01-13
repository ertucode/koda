import fs from "fs/promises";
import path from "path";
import { clipboard } from "electron";
import { expandHome } from "./expand-home.js";
import { GenericError, GenericResult } from "../../common/GenericError.js";
import { Result } from "../../common/Result.js";

const PDF_BASE64_PREFIX = "JVBERi0"; // %PDF- in base64
const PDF_DATA_URL_PREFIX = "data:application/pdf;base64,";

export async function createPdfFromClipboard(
  parentDir: string,
  name: string,
): Promise<GenericResult<{ path: string }>> {
  try {
    const expandedDir = expandHome(parentDir);

    // Get text from clipboard
    const clipboardText = clipboard.readText();
    
    if (!clipboardText) {
      return GenericError.Message("No PDF data in clipboard");
    }

    // Extract base64 data
    let base64Data: string;
    
    if (clipboardText.startsWith(PDF_DATA_URL_PREFIX)) {
      // data:application/pdf;base64,... format
      base64Data = clipboardText.slice(PDF_DATA_URL_PREFIX.length);
    } else if (clipboardText.startsWith(PDF_BASE64_PREFIX)) {
      // Raw base64 starting with %PDF-
      base64Data = clipboardText;
    } else {
      return GenericError.Message("Clipboard does not contain PDF data");
    }

    // Ensure .pdf extension
    const ext = path.extname(name).toLowerCase();
    if (ext !== ".pdf") {
      name = name + ".pdf";
    }

    const fullPath = path.join(expandedDir, name);

    // Check if file already exists
    try {
      await fs.access(fullPath);
      return GenericError.Message(`File ${name} already exists`);
    } catch {
      // File doesn't exist, which is what we want
    }

    // Decode base64 and write the PDF file
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(fullPath, buffer);

    return Result.Success({ path: fullPath });
  } catch (error) {
    if (error instanceof Error) {
      return GenericError.Message(error.message);
    }
    return GenericError.Unknown(error);
  }
}

export function hasClipboardPdf(): boolean {
  try {
    const clipboardText = clipboard.readText();
    if (!clipboardText) return false;
    
    return (
      clipboardText.startsWith(PDF_DATA_URL_PREFIX) ||
      clipboardText.startsWith(PDF_BASE64_PREFIX)
    );
  } catch {
    return false;
  }
}
