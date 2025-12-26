// Extensions that should not trigger a backend preview request
// These are files that either cannot be previewed or are handled
// in a special way (like archives showing their contents)
export const NO_PREVIEW_EXTENSIONS = new Set([
  // Executables
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".app",
  ".bin",
  
  // System files
  ".sys",
  ".tmp",
  ".cache",
  
  // Database files
  ".db",
  ".sqlite",
  ".mdb",
  
  // Large binary formats
  ".iso",
  ".dmg",
  ".pkg",
  
  // Encrypted/protected files
  ".p12",
  ".pfx",
  ".key",
  ".pem",
]);
