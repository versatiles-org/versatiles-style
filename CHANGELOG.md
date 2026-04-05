# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

