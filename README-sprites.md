# VersaTiles Sprites

Create sprites from SVG images, apply sizes, calculate SDF and render for different pixel ratios.

## I just want the sprites

You can find ready-to-use sprites under [Releases](https://github.com/versatiles-org/versatiles-sprites/releases)

## Usage

You need optipng.

* `npm run build` — Compose Icons into spritemaps as defined in [`config.ts`](./config.ts)

## SVG Sources

* SVG sources should consist only of paths and not contain any `transform()`s.
* Colors and styles are ignored.
* All lengths must be in pixels without unit.

## Configuration

Iconsets can be defined in [`config.ts`](./config.ts);
* `colors` are applied to each path in the order they appear in the source SVG.
* `size` applies to the height

## Licenses

* Sourcecode: [Unlicense](./UNLICENSE.md)
* Iconsets and rendered Spritemaps: [CC0 1.0 Universal](./icons/LICENSE.md)

