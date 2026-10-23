/* SpitzCode - 16-character score codes for the SpitzVerse arcade.
   Alphabet has no I, O, 0, or 1. The code packs (high bits to low):
     version 2 | game 5 | set 5 | topics 4 | run length 5 (x10 s) | day 9 | score 14 | correct 7 | answered 7 | seal 22
   The seal is a hash that includes the student's normalized name, so a code only
   checks out next to the name it was earned under.
   Version 1 = normal run. Version 2 = the suggested-skill bonus was applied to the score.
   (Anyone who reads this source could still forge one; that is fine for a classroom.) */
var SpitzCode = (function () {
  'use strict';
  var AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var EPOCH_DAY = Math.floor(Date.UTC(2026, 0, 1) / 86400000);

  function norm(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function fnv(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function clamp(x, bits) { return Math.max(0, Math.min((1 << bits) - 1, Math.floor(x || 0))); }
  function maskOf(topics) { var m = 0; (topics || []).forEach(function (t) { if (t >= 0 && t < 4) m |= (1 << t); }); return m; }
  function topicsOf(mask) { var a = []; for (var i = 0; i < 4; i++) if (mask & (1 << i)) a.push(i); return a; }

  var FIELDS = [['ver', 2], ['game', 5], ['set', 5], ['mask', 4], ['len', 5], ['day', 9], ['score', 14], ['correct', 7], ['answered', 7]];

  function payload(f) {
    var v = 0n;
    FIELDS.forEach(function (p) { v = (v << BigInt(p[1])) | BigInt(clamp(f[p[0]], p[1])); });
    return v;
  }
  function seal(v, name) { return fnv(v.toString(16) + '|' + norm(name) + '|sv1') & 0x3FFFFF; }
  function encode(v) {
    var out = '';
    for (var i = 0; i < 16; i++) { out = AL.charAt(Number(v & 31n)) + out; v >>= 5n; }
    return out.replace(/(.{4})(?=.)/g, '$1-');
  }

  // S = {name, score, correct, answered, set, topics:[indexes], seconds, bonus:true if the suggested-skill bonus is already in the score}
  function make(gameNo, S) {
    var f = {
      ver: S.bonus ? 2 : 1, game: gameNo, set: S.set, mask: maskOf(S.topics),
      len: Math.round((S.seconds || 0) / 10),
      day: (Math.floor(Date.now() / 86400000) - EPOCH_DAY) % 512,
      score: S.score, correct: S.correct, answered: S.answered
    };
    var p = payload(f);
    return encode((p << 22n) | BigInt(seal(p, S.name)));
  }

  function decode(code) {
    var c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 16) return null;
    var v = 0n, i, k;
    for (i = 0; i < 16; i++) { k = AL.indexOf(c.charAt(i)); if (k < 0) return null; v = (v << 5n) | BigInt(k); }
    var sl = Number(v & 0x3FFFFFn), p = v >> 22n, f = {}, j;
    for (j = FIELDS.length - 1; j >= 0; j--) { f[FIELDS[j][0]] = Number(p & ((1n << BigInt(FIELDS[j][1])) - 1n)); p >>= BigInt(FIELDS[j][1]); }
    f.topics = topicsOf(f.mask);
    f.seconds = f.len * 10;
    f.bonus = f.ver === 2; f._seal = sl; f._payload = (v >> 22n);
    return f;
  }

  // Does this code belong to this name?
  function verify(code, name) {
    var f = decode(code);
    if (!f) return { ok: false };
    return { ok: seal(f._payload, name) === f._seal, fields: f };
  }

  return { make: make, decode: decode, verify: verify, norm: norm };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SpitzCode;
