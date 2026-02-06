# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

