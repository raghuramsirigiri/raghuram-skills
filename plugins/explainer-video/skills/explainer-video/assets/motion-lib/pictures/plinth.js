/*!
 * pictures/plinth.js — emphasis, not a place: it lifts the place a scene
 * points at (or the one in view) onto a plinth, for a verdict about that
 * finding. It adds no figure and claims nothing a source doesn't.
 *
 *   "picture": { "kind": "plinth", "at": "hook" }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.pictures.register({ kind: 'plinth', emphasis: true, draw() {} });
})(typeof window !== 'undefined' ? window : globalThis);
