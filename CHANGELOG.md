# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.13.0] - 2026-06-22

### Features

- add experimental options for landcover rendering in style rules, fixes #114 and fixes #115 ([b0c8eaa](https://github.com/versatiles-org/versatiles-style/commit/b0c8eaa149be75d8f7e1a81f9ca1b1fec3258d86))
- enhance style rendering with 3D building support and experimental options, fixes #116 ([affb796](https://github.com/versatiles-org/versatiles-style/commit/affb7962c85dbffe42c1b3442830b49d5f05fc15))
- add support for 3D building heights and synchronize light settings with hillshade ([e574ef2](https://github.com/versatiles-org/versatiles-style/commit/e574ef29b76966d17f02d05bc10c7c2099870254))
- reorganize and enhance label definitions for place and boundary layers ([7080674](https://github.com/versatiles-org/versatiles-style/commit/7080674bb5cf6896c6993b70d28e31f809500a75))
- adjust building opacity for 3D rendering in style rules ([8edfcb1](https://github.com/versatiles-org/versatiles-style/commit/8edfcb13d0fc21c6fd8bdf3ce4ee7fd23b9fa201))
- add languageStrict option for enhanced language handling in style rules, fixes #117 ([4ebe7d4](https://github.com/versatiles-org/versatiles-style/commit/4ebe7d4e0abe3cff3f92fa6f95a295c4a7231ab9))
- increase maxzoom for satellite style to enhance detail in imagery ([f5d6b9d](https://github.com/versatiles-org/versatiles-style/commit/f5d6b9dd44bcea19f60f8a3ab1afbbb078e98a05))

### Build System

- **deps-dev:** bump the npm group with 10 updates ([2478712](https://github.com/versatiles-org/versatiles-style/commit/247871246ab0dc899296684de47a7d6b78ebcea9))

### Chores

- update dependencies in package.json ([03590b0](https://github.com/versatiles-org/versatiles-style/commit/03590b07d99fdc0b5decab8d64698da132253c50))

## [5.12.1] - 2026-05-22

### Features

- add TileJSON files for various vector and raster layers ([67311b3](https://github.com/versatiles-org/versatiles-style/commit/67311b389706a18c3e43508b69a4619e16521ea6))
- update center property to accept three numbers in TileJSON specification ([6a6ba6f](https://github.com/versatiles-org/versatiles-style/commit/6a6ba6fa2590643c702baf7cc6f7c7939bf463fb))
- add tests for real-world TileJSONs and validate generated MapLibre styles ([14670ab](https://github.com/versatiles-org/versatiles-style/commit/14670ab7bd3520c430db6f4197db7d176337e0db))
- enhance guessStyle function with improved TileJSON sanitization and validation ([2d0bc63](https://github.com/versatiles-org/versatiles-style/commit/2d0bc63be0f4288aefe9fdd5c464bab6a09332cd))
- add tests for handling partially invalid TileJSONs and validate vector layer filtering ([35e73c2](https://github.com/versatiles-org/versatiles-style/commit/35e73c253a7967b6dcd1447254e37411133a90a6))

### Bug Fixes

- update diagram structure in README for clarity and organization ([275733a](https://github.com/versatiles-org/versatiles-style/commit/275733a51a43e7dd7e9fec1838afeb3ecde69d52))

### Chores

- update dependencies to latest versions ([e6f8f15](https://github.com/versatiles-org/versatiles-style/commit/e6f8f15fe3375ba5a0898d65f27d636d03a58f2c))

## [5.12.0] - 2026-05-15

### Features

- render highway=busway and highway=bus_guideway as service streets ([1d2d15b](https://github.com/versatiles-org/versatiles-style/commit/1d2d15be8574ae68cbcbc0e03165c4977fa642fd))
- add textScale option to multiply symbol text sizes ([e91c2af](https://github.com/versatiles-org/versatiles-style/commit/e91c2afaa91fc6346477a0e810b735c276ab85d9))
- add iconScale option to scale icon sizes in symbol layers ([58cc1ff](https://github.com/versatiles-org/versatiles-style/commit/58cc1ff5d8c968364926a9a873a9cdac70b7b020))

### Bug Fixes

- fall back across name/name_en/name_<lang> for label text-field ([d734120](https://github.com/versatiles-org/versatiles-style/commit/d734120ce3e5c03efaf2b2dc57c7d5b1549e67d5))
- sort place labels by population for collision priority ([b53ea37](https://github.com/versatiles-org/versatiles-style/commit/b53ea37ff20de5895f47b2815486953b0c4e891f))
- reorder check script for improved execution flow ([eacc8eb](https://github.com/versatiles-org/versatiles-style/commit/eacc8eb7a3f11d5f398d32d31925023afb6446e2))
- render trunk roads one zoom earlier to match tile data availability ([ec736a5](https://github.com/versatiles-org/versatiles-style/commit/ec736a59894ccbbd909128aa3259836a5dd16959))
- derive housenumber colors via blend so they survive theme inversion ([fcc1815](https://github.com/versatiles-org/versatiles-style/commit/fcc18151579b8b6f501115e3343fafa695c4bf95))
- emit glyphs and sprite from satellite style with overlay disabled ([9d69de3](https://github.com/versatiles-org/versatiles-style/commit/9d69de3f73d92659c472fb0733756b833038dfdb))
- normalize attribution strings so MapLibre dedupes cosmetic duplicates ([e6d1f12](https://github.com/versatiles-org/versatiles-style/commit/e6d1f12e08940f2a6f306e346a019f9719d05b6f))

### Code Refactoring

- replace lighten/darken with blend(x, fg|bg) in colorful ([b515c9e](https://github.com/versatiles-org/versatiles-style/commit/b515c9ef67d88180a6830971621af41e09aa16aa))
- enhance documentation for color manipulation methods in Color, HSL, HSV, and RGB classes ([061f6a5](https://github.com/versatiles-org/versatiles-style/commit/061f6a54fce6ea46fe2982cd3348368842070068))

### Documentation

- add recommended icon sources to README, close #96 ([147328c](https://github.com/versatiles-org/versatiles-style/commit/147328cdcd4b3785fa1c84efb3df16a44de2738e))

### Chores

- update dependencies to latest versions ([d9ee972](https://github.com/versatiles-org/versatiles-style/commit/d9ee9722e12201a4693f88ec8282e580391787fc))

## [5.11.0] - 2026-05-08

### Features

- add elevation support with terrain and hillshade options ([6ef75eb](https://github.com/versatiles-org/versatiles-style/commit/6ef75eb8d9a09f3db5042773227e3883d3794fa3))

### Bug Fixes

- update default hillshade exaggeration ([90e454f](https://github.com/versatiles-org/versatiles-style/commit/90e454f3731619207cfd8d1d62edec4bf74e4d39))

### Code Refactoring

- update TypeScript configuration and improve layer definitions ([3ef41c3](https://github.com/versatiles-org/versatiles-style/commit/3ef41c3cf27a78cef7c56efa9f494445dec5dc96))

### Build System

- **deps:** bump actions/upload-pages-artifact in the action group ([5dbfabd](https://github.com/versatiles-org/versatiles-style/commit/5dbfabd6c5bd6264d60aff2ae72072977de10e8a))

### Chores

- update dependencies in package.json ([443fddd](https://github.com/versatiles-org/versatiles-style/commit/443fddd274c997d30b74937466ceb0a1a4f1511c))

### Other Changes

- +label-street-track ([78421f4](https://github.com/versatiles-org/versatiles-style/commit/78421f4e48943b7adc23ca24dcfcce7a01c3760a))
- fix test after adding missing label for tracks ([2c2573e](https://github.com/versatiles-org/versatiles-style/commit/2c2573e4b5b4961ad3c6e65683569cdf99129249))

## [5.10.2] - 2026-04-05

### Bug Fixes

- add index signature to StyleBuilderOptions and SatelliteStyleOptions interfaces

## [5.10.1] - 2026-04-04

### Bug Fixes

- remove center property from satellite source configuration

### Build System

- **deps:** bump the action group with 2 updates

### Chores

- update dependencies and devDependencies in package.json
- update dependencies in package.json

## [5.10.0] - 2026-03-12

### Features

- add support for terrain and hillshade layers in satellite style
- add initial HTML structure, main TypeScript logic, and Vite configuration for development
- add local sprites plugin to serve asset sprites from the release directory
- implement style variants management and update style selection in UI
- add terrain style variants for satellite rendering
- add tile_schema and encoding properties to TileJSONSpecificationRaster interface
- enhance elevation source handling in buildSatelliteStyle function
- add maplibre-gl dependency to package.json and package-lock.json
- add navigation control to the map on initialization
- enhance TileJSON specification with encoding and tile size properties

### Bug Fixes

- update script type and await style initialization in getStylePage function
- update style restoration to use query parameters instead of hash
- update check script to include typecheck command
- update type declarations to use 'any' for compatibility and add tsconfig for dev environment
- add exclusion for TypeScript files in tsconfig
- remove debug log for style loading in loadStyle function
- replace 'any' type with specific type for maplibregl and map variable
- remove exaggerated hillshade option and set default interpolation for hillshade-exaggeration
- change terrain variable from let to const for better immutability
- update hillshade-exaggeration to use interpolation for better zoom handling
- update format script to include log level for prettier
- improve hillshade layer configuration with customizable properties

### Code Refactoring

- remove unused server and MIME type handling code

### Chores

- update dependencies in package.json
- update dependencies to latest versions
- update @types/node to version 25.5.0

### Styles

- standardize HTML structure and formatting in index.html

## [5.9.5] - 2026-03-01

### Bug Fixes

- update test scripts and add end-to-end tests for style object validation
- update CI workflows to run all tests and add end-to-end testing step
- remove unnecessary initialization of saturation variable in HSL conversion
- update import statement for brace expansion and adjust usage in decorate function
- update brace-expansion and other dependencies in package.json
- remove unused inquirer types from dependencies in package.json
- add tslib as a dependency in package.json and package-lock.json

### Build System

- **deps:** bump the npm group with 11 updates

### Chores

- update dependencies and devDependencies in package.json

## [5.9.4] - 2026-02-15

### Bug Fixes

- update badge labels in README for consistency
- reorder build step in release workflow for improved execution
- add verification step for sprites.tar.gz size in release workflow
- remove redundant browser test for style object
- prevent tests from modifying the release directory by mocking fs methods
- update satellite style bounds and center coordinates for accuracy
- simplify mock implementations in sprite generation tests

### Chores

- update dependencies in package.json

## [5.9.3] - 2026-02-10

### Bug Fixes

- use await for satellite style rendering in screenshots script
- update rasterTilejson URLs to use baseUrl resolution

## [5.9.2] - 2026-02-10

### Bug Fixes

- update satellite style functions to use async/await, fetch TileJSON as a source and improve test cases

## [5.9.1] - 2026-02-09

### Bug Fixes

- remove src directory from files in package.json
- add CHANGELOG.md to .prettierignore
- add TypeScript configuration for documentation generation
- streamline testing steps in release workflow
- update bounds for raster source in buildSatelliteStyle function

## [5.9.0] - 2026-02-06

### Features

- add initial Vitest configuration for testing coverage
- add satellite style with customizable options and tests
- add satellite style option to StyleName and update config
- add satellite style to README and update screenshot rendering
- update satellite style

### Bug Fixes

- add .claude to .gitignore
- update node version range in devEngines to support up to 25.0.0
- improve error messages for unsupported types in deepClone and isBasicType functions
- enhance error messages
- improve error handling for unknown layer types in StyleBuilder
- add .vscode to .gitignore
- remove unreachable code in deepMerge
- update node version range in devEngines
- update @maplibre/maplibre-gl-style-spec and @types/node to latest versions
- correct comparison operators for gamma and contrast in recolor function
- improve error message for invalid vector layers
- replace ts-expect-error with type assertions for layer properties
- enforce strict equality checks in multiple files
- improve error handling in isVectorLayers function
- update satellite style tile URLs and rename option

### Performance Improvements

- pre-parse tint/blend colors in CachedRecolor constructor

### Code Refactoring

- remove build step from pre-push hook
- rename validation function for active recolor options
- remove unused toRGB() and toHSL() methods
- simplify StyleBuilderColorKey definition using const assertion
- streamline style name handling and update index page links

### Tests

- add color transformation methods tests for gamma, contrast, tint, blend, and setHue
- add edge cases for tint and blend methods in RGB class
- improve color transformation tests
- add additional tests for randomColor luminosity and saturation options
- add comprehensive tests for deepMerge functionality

### Build System

- **deps-dev:** bump the npm group with 12 updates
- **deps-dev:** bump tar from 7.5.3 to 7.5.6
- **deps-dev:** bump the npm group with 10 updates
- **deps:** update @types/node, @versatiles/release-tool, and esbuild to latest versions

### Chores

- update package.json dependencies
- update dependencies to latest versions

