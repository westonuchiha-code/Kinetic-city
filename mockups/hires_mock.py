"""Mock-up only: builds a double-resolution variant of dist/kinetic_city.html (640x360 art instead of 320x180).
Everything drawn from world coordinates gets twice the pixels; things drawn in fixed pixels are patched here
(characters use the redrawn sprites in mockups/chars32.js).
Usage: python3 mockups/hires_mock.py <out.html>"""
import sys
s = open('dist/kinetic_city.html').read()
def sub(a, b, n=1):
    global s
    assert s.count(a) == n, (a, s.count(a)); s = s.replace(a, b)
sub("const ART_W = 320, ART_H = 180, ISO_K = .5, ISO_KZ = .25, SPR_K = .6;", "const ART_W = 640, ART_H = 360, ISO_K = 1, ISO_KZ = .5, SPR_K = 1.2;")
sub("const PROP_KZ = .75;", "const PROP_KZ = 1.5;")
# characters: redrawn at double size (mockups/chars32.js) in place of the 16px templates
sub("  const g = buildCharGrid(dir, frame, o);\n  c = document.createElement('canvas'); c.width = g[0].length;", "  c = char32(dir, frame, o, pal); sprCache.set(key, c); return c;\n  const g = buildCharGrid(dir, frame, o);\n  c = document.createElement('canvas'); c.width = g[0].length;")
sub("const sprCache = new Map();", open('mockups/chars32.js').read() + "\nconst sprCache = new Map();")
sub("const a = isoXY(e.x, e.y, 0), lift = Math.round((e.z || 0) * .5), t = G.time;", "const a = isoXY(e.x, e.y, 0), lift = Math.round((e.z || 0) * 1), t = G.time;")
sub("const hx = a[0] + gx / gl * 4, hy = a[1] - 8 - lift + gy / gl * 2; iline([hx, hy], [hx + gx / gl * 4, hy + gy / gl * 3], '#2a2a32'); ipx(hx + gx / gl * 4, hy + gy / gl * 3, '#5a5a66');",
    "const hx = a[0] + gx / gl * 8, hy = a[1] - 16 - lift + gy / gl * 4; for (let w = 0; w < 2; w++) iline([hx, hy + w], [hx + gx / gl * 8, hy + w + gy / gl * 6], '#2a2a32'); ipx(hx + gx / gl * 8, hy + gy / gl * 6, '#5a5a66');")
# props drawn in fixed pixels
sub("const ca = Math.cos(e.ang || 0), sa = Math.sin(e.ang || 0), lift = (e.z || 0) * .5;", "const ca = Math.cos(e.ang || 0), sa = Math.sin(e.ang || 0), lift = (e.z || 0) * 1;")
sub("const fl = e.flash > 0, a = isoXY(e.x, e.y, 0), lift = (e.z || 0) * .5;", "const fl = e.flash > 0, a = isoXY(e.x, e.y, 0), lift = (e.z || 0) * 1;")
sub("ht = Math.round(22 * PROP_KZ), rx = 7, ry = 3.5, ty = by - ht;", "ht = Math.round(22 * PROP_KZ), rx = 14, ry = 7, ty = by - ht;")
# lamps, trees, windows, rain
sub("ctx.fillStyle = '#2a2e3a'; ctx.fillRect(Math.round(b[0]), Math.round(top[1]), 1, Math.round(b[1] - top[1]));", "ctx.fillStyle = '#2a2e3a'; ctx.fillRect(Math.round(b[0]) - 1, Math.round(top[1]), 2, Math.round(b[1] - top[1]));")
sub("ctx.fillRect(Math.round(b[0]) - 1, Math.round(b[1]) - 1, 3, 1); ctx.fillRect(Math.round(top[0]) - 1, Math.round(top[1]), 3, 1);", "ctx.fillRect(Math.round(b[0]) - 3, Math.round(b[1]) - 2, 6, 2); ctx.fillRect(Math.round(top[0]) - 3, Math.round(top[1]), 6, 2);")
sub("ctx.fillRect(Math.round(top[0]) - 1, Math.round(top[1]) + 1, 3, 1);\n  if (k > .2) iglow(top[0], top[1] + 1, 7, c, .7 * k);", "ctx.fillRect(Math.round(top[0]) - 3, Math.round(top[1]) + 2, 6, 2);\n  if (k > .2) iglow(top[0], top[1] + 2, 14, c, .7 * k);")
sub("ctx.fillRect(Math.round(b[0]), Math.round(c[1]), 2, Math.round(b[1] - c[1]));", "ctx.fillRect(Math.round(b[0]) - 1, Math.round(c[1]), 4, Math.round(b[1] - c[1]));")
sub("for (let k = -1; k <= 1; k++) ctx.fillRect(X + k, Y - 1 + Math.round(k * slope), 1, 2); }", "for (let k = -2; k <= 3; k++) ctx.fillRect(X + k, Y - 2 + Math.round(k * slope), 1, 4); }")
sub("for (let i = 0; i < 110; i++) rain.push({ x: rnd(ART_W), y: rnd(ART_H), l: rnd(3, 6) | 0, s: rnd(150, 230) });", "for (let i = 0; i < 330; i++) rain.push({ x: rnd(ART_W), y: rnd(ART_H), l: rnd(6, 12) | 0, s: rnd(300, 460) });")
open(sys.argv[1], 'w').write(s)
