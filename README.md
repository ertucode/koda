- npm run dev
- npm run build (Build for mac, works after npm run build-vendor is run once)
- npm run build-everything (Build for mac, runs build-vendor and build)
- xattr -cr /Applications/Koda.app (To run built)

# TODO

- unarchive as file if only one file
- fix dialog
- check ~/.Trash ask for disk access -> import { shell } from "electron";

shell.openExternal(
"x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
);

# AMBITIOUS TODO

- Plugin system ( run arbitrary script with the file path as an argument)
- File encryption
- tree view
- themes
