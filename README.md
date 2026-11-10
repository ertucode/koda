- npm run dev
- npm run build (Build for mac and install Koda for all users in `/Applications`; works after npm run build-vendor is run once)
- npm run build:app (Build and locally sign Koda for mac without installing)
- npm run sign:mac (Apply a local ad-hoc signature to the existing build)
- npm run install:mac (Install the existing build for all users; requires administrator access)
- npm run build-everything (Build vendor dependencies, build Koda, and install it)

# TODO

- for archives, navgate to it on double click. show unarchive button on the name part
  - open dialog

# AMBITIOUS TODO

- Plugin system
- File encryption
- tree view
- themes

# EH TODO

- fix pending selection to be actually pending selection, not after selection
