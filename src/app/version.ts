/**
 * What is running, as the footers say it: "v1.0.0 · 0f58423".
 *
 * The version is bumped by hand on every pull request (CI refuses one that forgets — see
 * scripts/check-version.mjs), so it says roughly how far along this is. The commit says exactly
 * which build, which is the question asked when something looks wrong on the live site.
 */
export const versionLabel = __APP_BUILD__ ? `v${__APP_VERSION__} · ${__APP_BUILD__}` : `v${__APP_VERSION__}`
