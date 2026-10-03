/**
 * Font discovery, for a font picker over the `font` of each `text` topic: the faces a glyph server
 * publishes (`fetchFontFaces`), and which writing systems and label languages a face covers
 * (`fontCovers` and the script helpers).
 *
 * **npm only.** Its own directory rather than a corner of `lib/` for one reason: the CDN bundle must not
 * carry it. `fontCovers.ts` freezes a table at module level — `Object.freeze` mutates, so no bundler may
 * drop it — and `lib/index.ts` is imported by everything, the browser entry included. Behind a barrel of
 * its own, it is reached only by what asks for it: the npm entry and `migrate/guess.ts`.
 * `src/browser.test.ts` and `scripts/browser-bundle.e2e.test.ts` check that the browser entry never does.
 */
export { fetchFontFaces, fontFamiliesUrl, type FontFaceInfo } from './fetchFontFaces.js';
export { fontCovers, fontScripts, languageScript, textScripts, FONT_SCRIPTS, LANGUAGE_SAMPLES } from './fontCovers.js';
