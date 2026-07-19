/* Sonor Cinema Aesthetic — luxury mood board PDF (v0.1.0)
   AestheticPdf.generate(model) — crisp vector A4 via pdf-lib + embedded Gilroy.
   Clones the Seating Configurator's proven PDF system (cinema-pdf-luxury skill):
   same mk(page,doc) helpers, palette, page furniture, frame-edge + divider rules.
   Pages: 1 dark cover · 2 mood board (swatches + palette) · 3 lighting · 4 the detail.
   No pricing — aesthetics are priced on the main cinema proposal.
*/
(function (global) {
  'use strict';

  var A4 = { w: 595.28, h: 841.89 };
  var M = 48;
  var GOLD = [173, 153, 120], GOLDL = [200, 180, 142], PUR = [128, 88, 161],
      CREAM = [246, 242, 234], INK = [26, 24, 20], INK2 = [60, 55, 47], MUT = [120, 112, 96],
      DARK = [9, 8, 7], LINE = [214, 205, 188];

  var HOUSE = 'M92.02,38.41v51.4c0,2.63-2.13,4.75-4.75,4.75h-3.34c-2.62,0-4.75-2.12-4.75-4.75v-45.34c0-2.45-1.11-4.77-3.01-6.31l-25.23-20.41c-2.8-2.27-6.76-2.42-9.73-.36l-23.15,16.05.45,1.55c22.38,9.5,40.47,30.05,47.71,53.39.95,3.06-1.32,6.18-4.53,6.18h-5.36c-2.08,0-3.9-1.37-4.54-3.35-6.96-21.83-24.83-38.23-46.17-46.13-1.31-.49-2.31-1.5-2.79-2.75-.2-.51-.31-1.06-.32-1.64l-.12-9.11c-.02-1.58.75-3.06,2.05-3.96L28.74,10.74,42.11,1.45c.16-.11.32-.22.49-.31,2.35-1.4,5.22-1.5,7.64-.34.57.26,1.12.61,1.63,1.03l37.16,30.29c1.89,1.54,2.99,3.85,2.99,6.29Z ' +
    'M34.59,94.55h-5.25c-1.6,0-3.09-.81-3.97-2.15-5.47-8.37-11.98-15.35-20.72-20.32-1.5-.85-2.45-2.42-2.45-4.15v-5.58c0-3.52,3.68-5.79,6.85-4.26,12.79,6.15,23.95,16.91,29.85,29.73,1.45,3.14-.86,6.73-4.32,6.73h0Z ' +
    'M4.26,83.39c7.65-1.71,9.39,9.06,4.03,10.83-8.9,2.94-11.25-9.22-4.03-10.83Z';
  var WA = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z';

  function col(a) { return global.PDFLib.rgb(a[0] / 255, a[1] / 255, a[2] / 255); }
  function hexRgb(hx) {
    hx = String(hx || '').replace('#', '');
    return /^[0-9a-f]{6}$/i.test(hx) ? [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)] : [80, 76, 70];
  }
  function selfDir() {
    try { var s = document.currentScript; if (s && s.src) return s.src.replace(/[^/]*$/, ''); } catch (e) {}
    try { var arr = document.getElementsByTagName('script'); for (var i = arr.length - 1; i >= 0; i--) { if (/aesthetic-pdf\.js/.test(arr[i].src)) return arr[i].src.replace(/[^/]*$/, ''); } } catch (e) {}
    return '../data/';
  }
  var BASE = selfDir();
  async function fetchBytes(url) { var r = await fetch(url); if (!r.ok) throw new Error('fetch ' + url + ' ' + r.status); return new Uint8Array(await r.arrayBuffer()); }
  async function loadImage(doc, url) {
    var abs = (typeof document !== 'undefined') ? new URL(url, document.baseURI).href : url;
    if (/\.jpe?g(\?|$)/i.test(abs)) return doc.embedJpg(await fetchBytes(abs));
    if (/\.png(\?|$)/i.test(abs)) return doc.embedPng(await fetchBytes(abs));
    var bytes = await fetchBytes(abs);
    var blob = new Blob([bytes]); var u = URL.createObjectURL(blob);
    try {
      var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = u; });
      var cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext('2d').drawImage(img, 0, 0);
      var dataUrl = cv.toDataURL('image/jpeg', 0.86);
      var b64 = dataUrl.split(',')[1], bin = atob(b64), out = new Uint8Array(bin.length);
      for (var k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
      return await doc.embedJpg(out);
    } finally { URL.revokeObjectURL(u); }
  }

  function mk(page, doc) {
    var P = {
      page: page,
      text: function (str, x, top, size, font, c, opts) { opts = opts || {}; page.drawText(String(str), { x: x, y: A4.h - top - size, size: size, font: font, color: col(c || INK), lineHeight: opts.lineHeight, maxWidth: opts.maxWidth }); },
      tracked: function (str, x, top, size, font, c, track) {
        track = track || 0; str = String(str); var cx = x, y = A4.h - top - size;
        for (var i = 0; i < str.length; i++) { page.drawText(str[i], { x: cx, y: y, size: size, font: font, color: col(c || INK) }); cx += font.widthOfTextAtSize(str[i], size) + track; }
        return cx - x - track;
      },
      trackedRight: function (str, right, top, size, font, c, track) {
        track = track || 0; str = String(str); var w = 0; for (var i = 0; i < str.length; i++) w += font.widthOfTextAtSize(str[i], size) + track; w -= track;
        P.tracked(str, right - w, top, size, font, c, track); return w;
      },
      right: function (str, right, top, size, font, c) { var w = font.widthOfTextAtSize(String(str), size); page.drawText(String(str), { x: right - w, y: A4.h - top - size, size: size, font: font, color: col(c || INK) }); },
      rect: function (x, top, w, h, c, o) { page.drawRectangle({ x: x, y: A4.h - top - h, width: w, height: h, color: col(c), opacity: o == null ? 1 : o }); },
      rectB: function (x, top, w, h, c, bw, o) { page.drawRectangle({ x: x, y: A4.h - top - h, width: w, height: h, borderColor: col(c), borderWidth: bw, opacity: 0, borderOpacity: o == null ? 1 : o }); },
      hline: function (x1, x2, top, c, t, o) { page.drawLine({ start: { x: x1, y: A4.h - top }, end: { x: x2, y: A4.h - top }, thickness: t || 0.6, color: col(c), opacity: o == null ? 1 : o }); },
      logo: function (x, top, h, c) { var sc = h / 95; page.drawSvgPath(HOUSE, { x: x, y: A4.h - top, scale: sc, color: col(c || GOLD) }); },
      image: function (img, x, top, w, h, o) { page.drawImage(img, { x: x, y: A4.h - top - h, width: w, height: h, opacity: o == null ? 1 : o }); },
      dot: function (x, top, r, c, borderC) { page.drawCircle({ x: x, y: A4.h - top, size: r, color: col(c), borderColor: borderC ? col(borderC) : undefined, borderWidth: borderC ? 0.6 : 0 }); },
      fadeDown: function (x, top, w, h, c, maxO, steps) {
        steps = steps || 56; maxO = maxO == null ? 1 : maxO;
        var slice = h / steps;
        for (var i = 0; i < steps; i++) {
          var t = (i + 1) / steps;
          var o = maxO * t * t * (1 - (1 - t) * 0.2);
          P.rect(x, top + slice * i, w, slice * 1.9, c, o * 0.62);
          P.rect(x, top + slice * i, w, slice * 1.1, c, o * 0.5);
        }
      }
    };
    return P;
  }

  function wrap(str, font, size, width) {
    var words = String(str || '').split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(t, size) > width && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function pageHead(P, F, m, label, pageNo, total) {
    var lhs = (pageNo >= 3 && label) ? label : 'CINEMA AESTHETIC PROPOSAL';
    P.tracked(lhs, M, 42, 8, F.r, [150, 138, 116], 2.4);
    if (pageNo) P.trackedRight(pageNo + ' / ' + total, A4.w - M, 42, 8, F.r, [170, 160, 140], 1.6);
    P.hline(M, A4.w - M, 68, LINE, 0.8);
  }
  function pageFoot(P, F, m) {
    var GDEEP = [140, 116, 60];
    P.hline(M, A4.w - M, A4.h - 56, LINE, 0.8);
    P.tracked('PROJECTS@SONOR.CO.UK', M, A4.h - 44.2, 7.2, F.r, GDEEP, 1.4);
    var s = 'SONOR', ss = 9.5, tr = 2.8, tw = 0;
    for (var i = 0; i < s.length; i++) tw += F.b.widthOfTextAtSize(s[i], ss) + tr;
    tw -= tr;
    var markW = 15 * (93 / 95), gap = 7, totW = markW + gap + tw;
    var cx0 = (A4.w - totW) / 2;
    P.logo(cx0, A4.h - 47.5, 15, GOLD);
    P.tracked(s, cx0 + markW + gap, A4.h - 44.6, ss, F.b, GDEEP, tr);
    var phone = '07933 684 000', ps = 8;
    var phW = 0; for (var j = 0; j < phone.length; j++) phW += F.r.widthOfTextAtSize(phone[j], ps) + 1.2;
    var phX = A4.w - M - phW;
    P.tracked(phone, phX, A4.h - 44.4, ps, F.r, GDEEP, 1.2);
    P.page.drawSvgPath(WA, { x: phX - 14, y: 45.6, scale: 9.5 / 24, color: col(GDEEP) });
  }

  // ── PAGE 1 · COVER — dark, palette-led (no hero image dependency) ─────────
  function cover(P, F, m, hero, cediaImg) {
    P.rect(0, 0, A4.w, A4.h, DARK);
    if (hero) {
      var iw = hero.width, ih = hero.height, s = Math.max(A4.w / iw, A4.h / ih);
      var dw = iw * s, dh = ih * s;
      P.image(hero, (A4.w - dw) / 2, 0, dw, dh, 1);
      P.fadeDown(0, A4.h * 0.6, A4.w, A4.h * 0.26, DARK, 1, 56);
      P.rect(0, A4.h * 0.86 - 1, A4.w, A4.h * 0.14 + 1, DARK, 1);
    } else {
      // palette-led cover: the chosen swatches as a full-width vertical band stack
      var sw = (m.slots || []).filter(function (s2) { return s2.hex; });
      if (sw.length) {
        var bandH = 320, bw = (A4.w - M * 1.24 * 2) / sw.length, bx = M * 1.24;
        sw.forEach(function (s2, i2) {
          P.rect(bx + i2 * bw, 170, bw - 4, bandH, hexRgb(s2.hex), 0.94);
        });
        P.fadeDown(0, 170 + bandH - 130, A4.w, 130, DARK, 1, 44);
      }
    }
    // inset frame — consistent inset all four sides (frame-edge rule)
    P.rectB(M * 0.62, M * 0.62, A4.w - M * 1.24, A4.h - M * 1.24, GOLD, 0.7, 0.34);

    var ty = 672;
    P.hline(M, M + 26, ty - 20, GOLD, 1, 0.95);
    P.tracked('CINEMA AESTHETIC PROPOSAL', M + 34, ty - 24, 8.5, F.r, GOLDL, 3.2);
    var title = m.title || 'Mood Board';
    var tsize = F.b.widthOfTextAtSize(title, 54) > (A4.w - M * 2) ? 40 : 54;
    P.text(title, M - 2, ty + (tsize === 40 ? 10 : 0), tsize, F.b, CREAM);
    P.text((m.styleLabel ? m.styleLabel + ' · ' : '') + 'mood board', M, ty + 62, 19, F.l, GOLDL);

    var iy = 772, cw = (A4.w - M * 2) / 3;
    P.hline(M, A4.w - M, iy - 16, GOLD, 0.5, 0.45);
    [['PREPARED FOR', m.client || '—'], ['PROJECT', m.project || '—'], ['REFERENCE', m.quoteRef || '—']].forEach(function (c, i) {
      var x = M + i * cw;
      P.tracked(c[0], x, iy, 7, F.r, [168, 156, 136], 1.8);
      P.text(c[1], x, iy + 13, 12.5, F.b, CREAM, { maxWidth: cw - 16 });
    });
    // logo strip in the clear band BELOW the frame (heights ≤13)
    var cyL = A4.h - 14;
    P.logo(M, cyL - 6, 12, CREAM);
    P.tracked('SONOR', M + 18, cyL - 4, 8, F.b, CREAM, 2.4);
    if (cediaImg) {
      var ch = (cediaImg.width / cediaImg.height) < 3 ? 13 : 9;
      var cwd = ch * (cediaImg.width / cediaImg.height);
      P.image(cediaImg, A4.w - M - cwd, cyL - ch / 2, cwd, ch, 0.92);
    } else {
      P.trackedRight('CEDIA MEMBER', A4.w - M, cyL - 3, 6, F.r, [168, 156, 136], 1.2);
    }
  }

  // ── PAGE 2 · MOOD BOARD — swatch tiles + palette strip ────────────────────
  function board(P, F, m, TOTAL, swatchImgs) {
    P.rect(0, 0, A4.w, A4.h, CREAM);
    pageHead(P, F, m, 'MOOD BOARD', 2, TOTAL);

    P.tracked((m.styleLabel || 'SCHEME').toUpperCase(), M, 92, 8.5, F.r, GOLD, 2.6);
    P.text(m.title || 'Mood Board', M - 1, 106, 26, F.b, INK);
    if (m.styleNote) {
      wrap(m.styleNote, F.r, 10.5, A4.w - M * 2).slice(0, 2).forEach(function (ln, i) {
        P.text(ln, M, 142 + i * 14, 10.5, F.r, INK2);
      });
    }
    // live context line — room + seating from the design apps
    var ctxBits = [];
    if (m.room && (m.room.w || m.room.d)) ctxBits.push('Room ' + (m.room.w || '?') + ' × ' + (m.room.d || '?') + ' mm' + (m.room.h ? ' × ' + m.room.h + ' h' : ''));
    if (m.seating) ctxBits.push('Seating: ' + m.seating);
    if (ctxBits.length) P.tracked(ctxBits.join('   ·   ').toUpperCase(), M, 176, 7, F.r, MUT, 1.5);
    P.hline(M, A4.w - M, 192, GOLD, 0.8, 0.75);

    // swatch tiles — 3 per row
    var cols = 3, gap = 14, tw = (A4.w - M * 2 - gap * (cols - 1)) / cols, th = 118;
    var y = 208;
    (m.slots || []).forEach(function (s, i) {
      var cx = M + (i % cols) * (tw + gap);
      var cy = y + Math.floor(i / cols) * (th + 46);
      var img = swatchImgs[i];
      if (img) {
        // preserve aspect: cover-crop is not possible — width-fit with height cap
        var dw = tw, dh = img.height * (tw / img.width);
        if (dh > th) { dh = th; dw = img.width * (th / img.height); }
        P.image(img, cx + (tw - dw) / 2, cy + (th - dh) / 2, dw, dh, 1);
      } else {
        P.rect(cx, cy, tw, th, hexRgb(s.hex), 1);
      }
      P.rectB(cx, cy, tw, th, LINE, 0.8);
      P.tracked(String(s.slot).toUpperCase(), cx, cy + th + 8, 6.5, F.r, MUT, 1.5);
      P.text(s.name, cx, cy + th + 18, 10.5, F.b, INK, { maxWidth: tw });
      if (s.manufacturer) P.text(s.manufacturer, cx, cy + th + 31, 8, F.r, MUT, { maxWidth: tw });
    });

    // palette strip — every hex in one row (no divider above: the tiles' border closes them)
    var rows = Math.ceil((m.slots || []).length / cols);
    var py = y + rows * (th + 46) + 8;
    P.tracked('PALETTE', M, py, 6.5, F.r, MUT, 1.5);
    var hexes = (m.slots || []).filter(function (s) { return s.hex; });
    var pw = (A4.w - M * 2) / Math.max(hexes.length, 1);
    hexes.forEach(function (s, i) {
      P.rect(M + i * pw, py + 12, pw - 3, 26, hexRgb(s.hex), 1);
    });
    P.rectB(M, py + 12, A4.w - M * 2, 26, LINE, 0.7);
    pageFoot(P, F, m);
  }

  // ── PAGE 3 · LIGHTING ─────────────────────────────────────────────────────
  function lighting(P, F, m, TOTAL) {
    P.rect(0, 0, A4.w, A4.h, CREAM);
    pageHead(P, F, m, 'LIGHTING', 3, TOTAL);

    P.tracked('WARM · CALM · PREMIUM', M, 92, 8.5, F.r, GOLD, 2.6);
    P.text('Lighting design', M - 1, 106, 26, F.b, INK);
    if (m.colourTemp) P.text(m.colourTemp, M, 142, 10.5, F.r, INK2, { maxWidth: A4.w - M * 2 });

    var y = 178;
    P.tracked('FITTINGS', M, y, 6.5, F.r, MUT, 1.5);
    P.hline(M, A4.w - M, y + 11, GOLD, 0.8, 0.75);
    y += 26;
    var fits = m.fittings || [];
    fits.forEach(function (f, i) {
      P.dot(M + 3, y - 4, 2.2, GOLD);
      P.text(f.label, M + 14, y - 9, 11, F.b, INK);
      if (f.hint) P.right(f.hint, A4.w - M, y - 8, 9, F.r, MUT);
      if (i < fits.length - 1) P.hline(M, A4.w - M, y + 7, LINE, 0.5, 0.6);
      y += 22;
    });

    y += 18;
    P.tracked('SCENES', M, y, 6.5, F.r, MUT, 1.5);
    P.hline(M, A4.w - M, y + 11, GOLD, 0.8, 0.75);
    y += 28;
    (m.scenes || []).forEach(function (sc, i, arr) {
      P.text(sc.label, M, y - 9, 12, F.b, [140, 116, 60]);
      var lines = wrap(sc.note || '', F.r, 10, A4.w - M * 2 - 130);
      lines.forEach(function (ln, li) { P.text(ln, M + 130, y - 9 + li * 13, 10, F.r, INK2); });
      var adv = Math.max(1, lines.length);
      if (i < arr.length - 1) P.hline(M, A4.w - M, y + 5 + (adv - 1) * 13, LINE, 0.5, 0.6);
      y += 24 + (adv - 1) * 13;
    });
    pageFoot(P, F, m);
  }

  // ── PAGE 4 · THE DETAIL ───────────────────────────────────────────────────
  function terms(P, F, m, TOTAL) {
    P.rect(0, 0, A4.w, A4.h, CREAM);
    pageHead(P, F, m, 'THE DETAIL', 4, TOTAL);

    P.tracked('THE DETAIL', M, 92, 8.5, F.r, GOLD, 2.6);
    P.text('Notes & next steps', M - 1, 106, 26, F.b, INK);

    var y = 158;
    (m.termsLines || []).forEach(function (t) {
      P.dot(M + 3, y - 3, 2.2, GOLD);
      var lines = wrap(t, F.r, 10.5, A4.w - M * 2 - 18);
      lines.forEach(function (ln, li) { P.text(ln, M + 14, y - 9 + li * 14.5, 10.5, F.r, INK2); });
      y += lines.length * 14.5 + 12;
    });

    // materials index — every pick, one line each
    y += 8;
    P.tracked('SELECTED MATERIALS', M, y, 6.5, F.r, MUT, 1.5);
    P.hline(M, A4.w - M, y + 11, GOLD, 0.8, 0.75);
    y += 26;
    (m.slots || []).forEach(function (s, i, arr) {
      P.rect(M, y - 11, 12, 12, hexRgb(s.hex), 1);
      P.rectB(M, y - 11, 12, 12, LINE, 0.6);
      P.text(s.slot + ' — ' + s.name + (s.manufacturer ? ' · ' + s.manufacturer : ''), M + 20, y - 9, 10, F.r, INK, { maxWidth: A4.w - M * 2 - 20 });
      if (i < arr.length - 1) P.hline(M, A4.w - M, y + 6, LINE, 0.5, 0.5);
      y += 21;
    });

    // reference — alone near the foot (matches the seating terms page)
    if (m.quoteRef) {
      P.tracked('REFERENCE', M, A4.h - 96, 6.5, F.r, MUT, 1.5);
      P.text(m.quoteRef, M, A4.h - 86, 11, F.b, INK);
      if (m.dateText) P.right(m.dateText, A4.w - M, A4.h - 85, 9.5, F.r, MUT);
    }
    pageFoot(P, F, m);
  }

  async function generate(m) {
    var PL = global.PDFLib;
    var doc = await PL.PDFDocument.create();
    try { if (global.fontkit) doc.registerFontkit(global.fontkit); } catch (e) {}
    var F = {};
    try {
      F.b = await doc.embedFont(await fetchBytes(BASE + 'fonts/gilroy-extrabold.otf'), { subset: false });
      F.r = await doc.embedFont(await fetchBytes(BASE + 'fonts/gilroy-regular.otf'), { subset: false });
      F.l = await doc.embedFont(await fetchBytes(BASE + 'fonts/gilroy-ultralight.otf'), { subset: false });
    } catch (e) {
      F.b = await doc.embedFont(PL.StandardFonts.HelveticaBold);
      F.r = await doc.embedFont(PL.StandardFonts.Helvetica);
      F.l = F.r;
    }
    var hero = null, cedia = null;
    if (m.heroImage) { try { hero = await loadImage(doc, m.heroImage); } catch (e) {} }
    try { cedia = await loadImage(doc, BASE + 'cedia-member-stacked.png'); } catch (e) {}
    // swatch photos (index-aligned with m.slots; null = hex tile)
    var swatchImgs = [];
    for (var i = 0; i < (m.slots || []).length; i++) {
      var s = m.slots[i]; var im = null;
      if (s.swatchImg) { try { im = await loadImage(doc, s.swatchImg); } catch (e) {} }
      swatchImgs.push(im);
    }
    var TOTAL = 4;
    var p1 = doc.addPage([A4.w, A4.h]); cover(mk(p1, doc), F, m, hero, cedia);
    var p2 = doc.addPage([A4.w, A4.h]); board(mk(p2, doc), F, m, TOTAL, swatchImgs);
    var p3 = doc.addPage([A4.w, A4.h]); lighting(mk(p3, doc), F, m, TOTAL);
    var p4 = doc.addPage([A4.w, A4.h]); terms(mk(p4, doc), F, m, TOTAL);

    var bytes = await doc.save();
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = m.filename || 'sonor-aesthetic.pdf';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return true;
  }

  global.AestheticPdf = {
    generate: generate,
    available: function () { return !!(global.PDFLib && global.PDFLib.PDFDocument); }
  };
})(window);
