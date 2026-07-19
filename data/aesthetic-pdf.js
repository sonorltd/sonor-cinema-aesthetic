/* Sonor Cinema Aesthetic — CINEMA DESIGN PROPOSAL (v0.2.0)
   AestheticPdf.generate(model) — the full client-facing cinema spec report,
   built ENTIRELY on the shared SonorPdfLuxury chrome (data/sonor-pdf-luxury.js,
   root master — the exact seating-proposal system, so both documents stay in
   sync when the style evolves). Cover image + logos identical to the seating app.
   Sections (data-driven, empty sections dropped):
   Cover · Introduction · Video System · Audio System · Lighting · LED Lighting ·
   Star Ceiling · Materials & Finishes · The Detail.
   No pricing — commercials live on the formal quotation.
*/
(function (global) {
  'use strict';

  function L() { return global.SonorPdfLuxury; }
  var DOC_LABEL = 'CINEMA DESIGN PROPOSAL';

  function selfDir() {
    try { var s = document.currentScript; if (s && s.src) return s.src.replace(/[^/]*$/, ''); } catch (e) {}
    try { var arr = document.getElementsByTagName('script'); for (var i = arr.length - 1; i >= 0; i--) { if (/aesthetic-pdf\.js/.test(arr[i].src)) return arr[i].src.replace(/[^/]*$/, ''); } } catch (e) {}
    return '../data/';
  }
  var BASE = selfDir();

  function inchDiag(w, h) {
    if (!w || !h) return null;
    return Math.round(Math.sqrt(w * w + h * h) / 25.4);
  }
  function mmTxt(v) { return v != null ? Math.round(v).toLocaleString('en-GB') + ' mm' : null; }

  // ── section builders — each returns null when it has nothing to say ───────
  function secIntro(m) {
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      lx.pageHead(P, F, 'INTRODUCTION', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, m.styleLabel || 'Sonor Cinema', m.title || 'Your cinema',
        m.introText);
      y = Math.max(y, 176);
      var colW = 236;
      var rows1 = [
        ['Room', m.room && (m.room.w || m.room.d) ? (mmTxt(m.room.w) + ' × ' + mmTxt(m.room.d) + (m.room.h ? ' × ' + mmTxt(m.room.h) + ' high' : '')) : null],
        ['Performance target', m.performanceLevel ? 'CEDIA RP22 · Level ' + m.performanceLevel : null],
        ['Seating', m.seating || null],
        ['Design direction', m.styleLabel ? (m.styleLabel + (m.styleNote ? ' — ' + m.styleNote : '')) : null]
      ];
      var rows2 = [
        ['Display', m.video && m.video.display || null],
        ['Audio', m.audio && m.audio.headline || null],
        ['Lighting', m.lightingHeadline || null],
        ['Ceiling', m.ceilingTreatment ? m.ceilingTreatment.label + (m.star ? ' — see Star Ceiling section' : '') : null],
        ['Tiered seating', m.riser ? m.riser.label : null]
      ];
      var b1 = lx.specRows(P, F, rows1, lx.M, y, colW);
      var b2 = lx.specRows(P, F, rows2, lx.M + colW + 28, y, colW);
      // what's in this document
      var dy = Math.max(b1, b2) + 26;
      P.tracked('IN THIS PROPOSAL', lx.M, dy, 6.5, F.r, lx.COL.MUT, 1.5);
      P.hline(lx.M, lx.A4.w - lx.M, dy + 11, lx.COL.GOLD, 0.8, 0.75);
      var items = m.sectionList || [];
      var iy = dy + 27;
      items.forEach(function (s, i) {
        P.dot(lx.M + 3, iy - 4, 2.2, lx.COL.GOLD);
        P.text(s, lx.M + 14, iy - 9, 10.5, F.r, lx.COL.INK);
        iy += 19;
      });
      lx.pageFoot(P, F);
    };
  }

  function blurb(key, fallback) {
    var b = (global.__AESTHETIC_CONFIG__ || {}).sectionBlurbs || {};
    return b[key] || fallback;
  }

  // ── DESIGN CONCEPTS — render page (hero + tiles from projects.metadata.design_renders) ──
  function secConcepts(m, renderImgs) {
    if (!m.renders || !m.renders.length) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'DESIGN CONCEPTS', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, (m.styleLabel || 'THE SCHEME'), 'Design concepts', blurb('concepts'));
      y = Math.max(y, 190);
      var hero = renderImgs[0];
      var capH = 18;
      if (hero) {
        var w = A4.w - M * 2, h = hero.height * (w / hero.width);
        var hMax = (m.renders.length > 1) ? 330 : 470;
        if (h > hMax) { h = hMax; w = hero.width * (h / hero.height); }
        var hx = M + (A4.w - M * 2 - w) / 2;
        P.image(hero, hx, y, w, h, 1);
        P.rectB(hx, y, w, h, COL.LINE, 0.8);
        var cap = (m.renders[0] && m.renders[0].caption) || '';
        if (cap) P.tracked(cap.toUpperCase(), hx, y + h + 8, 6.5, F.r, COL.MUT, 1.5);
        y += h + capH + 14;
      }
      // additional render tiles, two-up
      var rest = renderImgs.slice(1).filter(Boolean);
      if (rest.length) {
        var gap = 14, tw = (A4.w - M * 2 - gap) / 2;
        rest.slice(0, 2).forEach(function (img, i) {
          var th = img.height * (tw / img.width), thMax = 200;
          var dw = tw, dh = th;
          if (dh > thMax) { dh = thMax; dw = img.width * (dh / img.height); }
          var cx = M + i * (tw + gap) + (tw - dw) / 2;
          P.image(img, cx, y, dw, dh, 1);
          P.rectB(cx, y, dw, dh, COL.LINE, 0.8);
          var cap2 = (m.renders[i + 1] && m.renders[i + 1].caption) || '';
          if (cap2) P.tracked(cap2.toUpperCase(), M + i * (tw + gap), y + dh + 8, 6, F.r, COL.MUT, 1.3);
        });
      }
      lx.pageFoot(P, F);
    };
  }

  // ── v0.7.0 — per-aspect grade badges (medal pills: tier colour + label).
  //    P.rrect is border-only, so the pill fill = rect body + circle end-caps. ──
  function pillW(F, t) { return F.b.widthOfTextAtSize(t, 7) + (t.length - 1) * 1.2 + 22; }
  function pill(P, F, lx, x, y, t, hex) {
    var rgb = lx.hexRgb(hex), h = 15, w = pillW(F, t);
    P.dot(x + h / 2, y + h / 2, h / 2, rgb);
    P.dot(x + w - h / 2, y + h / 2, h / 2, rgb);
    P.rect(x + h / 2, y, w - h, h, rgb, 1);
    P.tracked(t, x + 11, y + 4.2, 7, F.b, [255, 255, 255], 1.2);
    return w;
  }
  function badge(P, F, lx, x, y, label, hex) { return pill(P, F, lx, x, y, String(label).toUpperCase(), hex); }
  // right-aligned row of aspect badges (e.g. "VIDEO · SILVER  SPEAKERS · GOLD")
  function badgeRow(P, F, lx, y, entries) {
    if (!entries || !entries.length) return;
    var x = lx.A4.w - lx.M;
    entries.slice().reverse().forEach(function (e) {
      var t = (e.aspect + ' · ' + e.label).toUpperCase();
      x -= pillW(F, t);
      pill(P, F, lx, x, y, t, e.hex);
      x -= 8;
    });
  }
  function gradeEntries(m, aspects) {
    var LBL = { video: 'Video', speakers: 'Speakers', electronics: 'Electronics' };
    return aspects.map(function (a) {
      var g = m.grades && m.grades[a];
      return g ? { aspect: LBL[a], label: g.label, hex: g.badgeHex } : null;
    }).filter(Boolean);
  }

  // per-line links row (WeQuote-style: every line carries its references)
  function lineLinks(P, F, lx, x, y, links) {
    var drawn = 0, cx = x;
    if (links && links.url) { cx += P.link('Product page', cx, y, 7.5, F.r, lx.COL.GDEEP, links.url) + 16; drawn++; }
    if (links && links.datasheet) { cx += P.link('Datasheet', cx, y, 7.5, F.r, lx.COL.GDEEP, links.datasheet) + 16; drawn++; }
    return drawn;
  }

  function secVideo(m) {
    if (!m.video || (!m.video.display && !m.video.screenW)) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      lx.pageHead(P, F, 'VIDEO SYSTEM', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, 'REFERENCE PICTURE', 'Video system', blurb('video'));
      badgeRow(P, F, lx, 103, gradeEntries(m, ['video']));   // v0.7.0 — medal badge
      y = Math.max(y, 196);
      var v = m.video;
      var diag = inchDiag(v.screenW, v.screenH);
      var g = m.grades && m.grades.video;
      var rows = [
        ['Video grade', g ? (g.label + (g.note ? ' — ' + g.note : '')) : null],
        ['Display', v.display],
        ['Image size', v.screenW ? (mmTxt(v.screenW) + ' × ' + mmTxt(v.screenH) + (diag ? '  ·  ' + diag + '" diagonal' : '')) : null],
        ['Image bottom (AFL)', mmTxt(v.bottomFromFloor)],
        ['Viewing distance (MLP)', v.viewingDistance ? mmTxt(v.viewingDistance) + (v.screenH ? '  ·  ' + (v.viewingDistance / v.screenH).toFixed(1) + '× picture height' : '') : null],
        ['Content mastering', v.contentRes ? String(v.contentRes).toUpperCase() + ' HDR' : null],
        ['Projector', v.projector],
        ['Screen gain', v.screenGain && v.screenGain !== 1 ? String(v.screenGain) : null]
      ];
      var b = lx.specRows(P, F, rows, lx.M, y, 300);
      if (v.displayLinks && (v.displayLinks.url || v.displayLinks.datasheet)) {
        lineLinks(P, F, lx, lx.M, b + 8, v.displayLinks);
      }
      lx.pageFoot(P, F);
    };
  }

  function secAudio(m) {
    if (!m.audio || !m.audio.headline) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      lx.pageHead(P, F, 'AUDIO SYSTEM', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, 'IMMERSIVE SOUND', 'Audio system', blurb('audio'));
      badgeRow(P, F, lx, 103, gradeEntries(m, ['speakers', 'electronics']));   // v0.7.0 — medals
      y = Math.max(y, 200);
      var a = m.audio;
      var gs = m.grades && m.grades.speakers, ge = m.grades && m.grades.electronics;
      var rows = [
        ['Loudspeaker grade', gs ? (gs.label + (gs.note ? ' — ' + gs.note : '') + (gs.tbc ? ' · TBC' : '')) : null],
        ['Electronics grade', ge ? (ge.label + (ge.note ? ' — ' + ge.note : '')) : null],
        ['Configuration', a.headline],
        ['Channels required', a.channelSummary],
        ['Main listening position', a.mlpDist ? mmTxt(a.mlpDist) + ' from the screen wall' : null],
        ['Ear height (reference)', mmTxt(a.earHeight)]
      ];
      var b = lx.specRows(P, F, rows, lx.M, y, 320);
      // channel-by-channel loudspeaker schedule — WeQuote-style: one line per
      // position, qty × model, per-line product/datasheet links underneath
      if (a.channels && a.channels.length) {
        var M = lx.M, A4 = lx.A4, COL = lx.COL;
        var cy = b + 20;
        P.tracked('LOUDSPEAKERS', M, cy, 6.5, F.r, COL.MUT, 1.5);
        P.hline(M, A4.w - M, cy + 11, COL.GOLD, 0.8, 0.75);
        cy += 27;
        a.channels.forEach(function (c, i, arr) {
          P.text(c.label, M, cy - 9, 10.5, F.r, COL.INK2);
          P.right(c.qty + ' ×   ' + (c.model || 'TBC'), A4.w - M, cy - 9, 10.5, F.b, COL.INK);
          var extra = 0;
          if (c.url || c.datasheet) {           // links row — advance accounted (truncate-vs-wrap rule)
            lineLinks(P, F, lx, M + 12, cy + 5, c);
            extra = 13;
          }
          if (i < arr.length - 1) P.hline(M, A4.w - M, cy + 6 + extra, COL.LINE, 0.5, 0.6);
          cy += 21 + extra;
        });
        var elec = [];
        if (a.processor) elec.push(['Processor / receiver', a.processor]);
        if (a.amplifier) elec.push(['Power amplification', a.amplifier]);
        if (elec.length) {
          cy += 12;
          P.tracked('ELECTRONICS', M, cy, 6.5, F.r, COL.MUT, 1.5);
          P.hline(M, A4.w - M, cy + 11, COL.GOLD, 0.8, 0.75);
          cy += 27;
          elec.forEach(function (r, i, arr) {
            P.text(r[0], M, cy - 9, 10.5, F.r, COL.INK2);
            P.right(r[1].model, A4.w - M, cy - 9, 10.5, F.b, COL.INK);
            var extra = 0;
            if (r[1].url || r[1].datasheet) { lineLinks(P, F, lx, M + 12, cy + 5, r[1]); extra = 13; }
            if (i < arr.length - 1) P.hline(M, A4.w - M, cy + 6 + extra, COL.LINE, 0.5, 0.6);
            cy += 21 + extra;
          });
        }
        cy += 10;
        P.text('Full in-room calibration and level matching on commissioning.', M, cy, 9, F.r, COL.MUT);
      }
      lx.pageFoot(P, F);
    };
  }

  function secLighting(m) {
    if ((!m.fittings || !m.fittings.length) && (!m.scenes || !m.scenes.length)) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      lx.pageHead(P, F, 'LIGHTING', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, 'WARM · CALM · PREMIUM', 'Lighting design', blurb('lighting', m.colourTemp));
      y = Math.max(y, 178);
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      P.tracked('FITTINGS', M, y, 6.5, F.r, COL.MUT, 1.5);
      P.hline(M, A4.w - M, y + 11, COL.GOLD, 0.8, 0.75);
      y += 26;
      var fitRows = (m.fittings || []).slice();
      if (m.sconces) fitRows.push({ label: 'Wall lights / sconces', hint: 'TBC — shortlist at design development' + (m.sconces.notes ? ' · ' + m.sconces.notes : '') });
      fitRows.forEach(function (f, i, arr) {
        P.dot(M + 3, y - 4, 2.2, COL.GOLD);
        P.text(f.label + (f.qty ? '  ·  ' + f.qty : ''), M + 14, y - 9, 11, F.b, COL.INK);
        if (f.hint) P.right(f.hint, A4.w - M, y - 8, 9, F.r, COL.MUT);
        if (i < arr.length - 1) P.hline(M, A4.w - M, y + 7, COL.LINE, 0.5, 0.6);
        y += 22;
      });
      if (m.downlightGrade) {
        y += 4;
        P.text('Downlight grade: ' + m.downlightGrade.label + ' (' + m.downlightGrade.tier + ') — ' + m.downlightGrade.note, M, y - 4, 9, F.r, COL.MUT, { maxWidth: A4.w - M * 2 });
        y += 16;
      }
      y += 14;
      P.tracked('SCENES', M, y, 6.5, F.r, COL.MUT, 1.5);
      P.hline(M, A4.w - M, y + 11, COL.GOLD, 0.8, 0.75);
      y += 28;
      (m.scenes || []).forEach(function (sc, i, arr) {
        P.text(sc.label, M, y - 9, 12, F.b, COL.GDEEP);
        var lines = lx.wrap(sc.note || '', F.r, 10, A4.w - M * 2 - 130);
        lines.forEach(function (ln, li) { P.text(ln, M + 130, y - 9 + li * 13, 10, F.r, COL.INK2); });
        var adv = Math.max(1, lines.length);
        if (i < arr.length - 1) P.hline(M, A4.w - M, y + 5 + (adv - 1) * 13, COL.LINE, 0.5, 0.6);
        y += 24 + (adv - 1) * 13;
      });
      lx.pageFoot(P, F);
    };
  }

  function secLed(m) {
    if (!m.led || !m.led.zones || !m.led.zones.length) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'LED LIGHTING', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, 'CONCEALED LINEAR LIGHT', 'LED lighting', blurb('led'));
      y = Math.max(y, 186);
      P.tracked('LED ZONES', M, y, 6.5, F.r, COL.MUT, 1.5);
      P.hline(M, A4.w - M, y + 11, COL.GOLD, 0.8, 0.75);
      y += 27;
      m.led.zones.forEach(function (z, i, arr) {
        P.dot(M + 3, y - 4, 2.2, COL.GOLD);
        P.text(z.label + (z.label === 'Ceiling Cove' && m.led.covePower ? '  ·  ' + m.led.covePower + ' W/m' : ''), M + 14, y - 9, 11, F.b, COL.INK);
        if (z.hint) P.right(z.hint, A4.w - M, y - 8, 9, F.r, COL.MUT);
        if (i < arr.length - 1) P.hline(M, A4.w - M, y + 7, COL.LINE, 0.5, 0.6);
        y += 22;
      });
      y += 14;
      P.text('All circuits individually dimmed via the Rako lighting scenes.', M, y, 9.5, F.r, COL.MUT);
      lx.pageFoot(P, F);
    };
  }

  function secJoinery(m) {
    var haveNotes = !!m.joineryNotes, haveSundries = (m.sundries || []).length || m.sundriesNotes;
    if (!haveNotes && !haveSundries) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'JOINERY & SUNDRIES', pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, 'THE FINISHING KIT', 'Joinery & sundries',
        'Cabinetry intent and the accessories that make the room feel finished on day one.');
      y = Math.max(y, 186);
      if (haveNotes) {
        P.tracked('JOINERY & CABINETRY', M, y, 6.5, F.r, COL.MUT, 1.5);
        P.hline(M, A4.w - M, y + 11, COL.GOLD, 0.8, 0.75);
        y += 26;
        lx.wrap(m.joineryNotes, F.r, 10.5, A4.w - M * 2).forEach(function (ln) {
          P.text(ln, M, y - 9, 10.5, F.r, COL.INK2); y += 15;
        });
        y += 16;
      }
      if (haveSundries) {
        P.tracked('SUNDRIES & ACCESSORIES', M, y, 6.5, F.r, COL.MUT, 1.5);
        P.hline(M, A4.w - M, y + 11, COL.GOLD, 0.8, 0.75);
        y += 27;
        (m.sundries || []).forEach(function (s, i, arr) {
          P.dot(M + 3, y - 4, 2.2, COL.GOLD);
          P.text(s, M + 14, y - 9, 11, F.b, COL.INK);
          if (i < arr.length - 1) P.hline(M, A4.w - M, y + 7, COL.LINE, 0.5, 0.6);
          y += 22;
        });
        if (m.sundriesNotes) {
          y += 8;
          lx.wrap(m.sundriesNotes, F.r, 10, A4.w - M * 2).forEach(function (ln) {
            P.text(ln, M, y - 9, 10, F.r, COL.MUT); y += 14;
          });
        }
      }
      lx.pageFoot(P, F);
    };
  }

  function secStar(m) {
    if (!m.star) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      lx.pageHead(P, F, 'STAR CEILING', pageNo, TOTAL, DOC_LABEL);
      // NOTE: Gilroy's 'ff' ligature renders broken (cinema-pdf-luxury §4) — the
      // word "coffer" is banned on these pages; "ceiling recess" is used instead.
      var y = lx.sectionHead(P, F, 'FIBRE-OPTIC NIGHT SKY', 'Star ceiling', blurb('star'));
      y = Math.max(y, 186);
      var s = m.star;
      var rows = [
        ['Star field', s.panelMode ? 'Fibre-optic star panels · ' + s.panelMode + ' mm panel module' : 'Fibre-optic star field'],
        ['Location', 'Set into the ceiling recess, over the seating area'],
        ['Ceiling recess', s.dropHeight ? Math.round(s.dropHeight) + ' mm drop' + (s.ring ? ' · ' + s.ring + ' mm perimeter ring' : '') : null],
        ['Effect', 'Twinkle and intensity dimmable within the lighting scenes'],
        ['Downlights', s.downlights ? s.downlights + ' recessed downlights integrated in the perimeter ring' : null]
      ];
      lx.specRows(P, F, rows, lx.M, y, 300);
      lx.pageFoot(P, F);
    };
  }

  // v0.7.1 — redesigned board: named PROJECT PALETTE band (devised from the
  // client concept render, projects.metadata.design_palette) above the swatch
  // tiles; painted tiles take the palette's lead colour; one-line truncation
  // rules kept (cinema-pdf-luxury §5).
  function secBoard(m, swatchImgs) {
    if (!m.slots || !m.slots.length) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'MATERIALS & FINISHES', pageNo, TOTAL, DOC_LABEL);
      lx.sectionHead(P, F, (m.styleLabel || 'SCHEME'), 'Materials & finishes', blurb('materials'));
      var y = 192;
      var pal = m.palette && m.palette.swatches && m.palette.swatches.length ? m.palette : null;
      if (pal) {
        P.tracked('PROJECT PALETTE', M, y, 6.5, F.r, COL.MUT, 1.5);
        P.hline(M, A4.w - M, y + 11, COL.GOLD, 0.8, 0.75);
        y += 22;
        var n = pal.swatches.length, pgap = 10;
        var pw = (A4.w - M * 2 - pgap * (n - 1)) / n, ph = 40;
        pal.swatches.forEach(function (p, i) {
          var px = M + i * (pw + pgap);
          P.rect(px, y, pw, ph, lx.hexRgb(p.hex), 1);
          P.rectB(px, y, pw, ph, COL.LINE, 0.8);
          // one-line name truncation
          var nm = String(p.name);
          while (nm.length > 3 && F.b.widthOfTextAtSize(nm, 8) > pw) nm = nm.slice(0, -2).replace(/\s+$/, '');
          P.text(nm === p.name ? nm : nm + '…', px, y + ph + 8, 8, F.b, COL.INK);
          P.text(String(p.hex).toUpperCase(), px, y + ph + 19, 6.5, F.r, COL.MUT);
        });
        y += ph + 32;
        if (pal.source) { P.text(pal.source + '.', M, y - 4, 8, F.r, COL.MUT); y += 14; }
        y += 4;
      } else {
        P.hline(M, A4.w - M, y, COL.GOLD, 0.8, 0.75);
        y += 16;
      }
      var cols = 3, gap = 14, tw = (A4.w - M * 2 - gap * (cols - 1)) / cols, th = 104;
      var lead = pal ? pal.swatches[0] : null;   // palette lead colour for painted tiles
      (m.slots || []).forEach(function (s, i) {
        var cx = M + (i % cols) * (tw + gap);
        var cy = y + Math.floor(i / cols) * (th + 50);
        var img = swatchImgs[i];
        if (img) {
          var dw = tw, dh = img.height * (tw / img.width);
          if (dh > th) { dh = th; dw = img.width * (th / img.height); }
          P.image(img, cx + (tw - dw) / 2, cy + (th - dh) / 2, dw, dh, 1);
        } else if (s.hex) {
          P.rect(cx, cy, tw, th, lx.hexRgb(s.hex), 1);
        } else if (s.painted) {
          if (lead) {
            P.rect(cx, cy, tw, th, lx.hexRgb(lead.hex), 1);
            P.center('PAINTED FINISH', cx + tw / 2, cy + th / 2 - 8, 8, F.b, COL.CREAM, 2);
            P.center(String(lead.name).toUpperCase() + ' · ' + String(lead.hex).toUpperCase(), cx + tw / 2, cy + th / 2 + 6, 5.5, F.r, COL.CREAM, 1.2);
          } else {
            P.rect(cx, cy, tw, th, [238, 234, 226], 1);
            P.center('PAINTED FINISH', cx + tw / 2, cy + th / 2 - 8, 8, F.b, COL.MUT, 2);
            P.center('COLOUR FROM THE SCHEME PALETTE', cx + tw / 2, cy + th / 2 + 6, 5.5, F.r, COL.MUT, 1.2);
          }
        } else {
          P.rect(cx, cy, tw, th, [234, 229, 219], 1);
          P.center(String(s.manufacturer || 'SAMPLE').toUpperCase(), cx + tw / 2, cy + th / 2 - 8, 8, F.b, COL.MUT, 2);
          P.center('COLOURWAY ON SAMPLE APPROVAL', cx + tw / 2, cy + th / 2 + 6, 5.5, F.r, COL.MUT, 1.2);
        }
        P.rectB(cx, cy, tw, th, COL.LINE, 0.8);
        P.tracked(String(s.slot).toUpperCase(), cx, cy + th + 8, 6.5, F.r, COL.MUT, 1.5);
        // TRUNCATE to one line (truncate-vs-wrap rule) — a wrapped name overlaps the maker line
        var nm = String(s.name);
        while (nm.length > 3 && F.b.widthOfTextAtSize(nm, 10.5) > tw) nm = nm.slice(0, -2).replace(/\s+$/, '');
        P.text(nm === s.name ? nm : nm + '…', cx, cy + th + 18, 10.5, F.b, COL.INK);
        var sub = s.manufacturer ? (s.manufacturer + (s.colourways ? ' · ' + s.colourways + ' colourways' : '')) : (s.note || '');
        if (sub) {
          var sb = String(sub);
          while (sb.length > 3 && F.r.widthOfTextAtSize(sb, 8) > tw) sb = sb.slice(0, -2).replace(/\s+$/, '');
          P.text(sb === String(sub) ? sb : sb + '…', cx, cy + th + 31, 8, F.r, COL.MUT);
        }
      });
      var rows = Math.ceil((m.slots || []).length / cols);
      var by = y + rows * (th + 50) + 6;
      P.text('Physical samples of every surface are approved before any order is placed.', M, by, 8.5, F.r, COL.MUT);
      lx.pageFoot(P, F);
    };
  }

  // ── v0.7.0 — DESIGN SCOPE: dynamic Library option selections, two columns ──
  function secScope(m) {
    if (!m.optionGroups || !m.optionGroups.length) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'DESIGN SCOPE', pageNo, TOTAL, DOC_LABEL);
      var y0 = lx.sectionHead(P, F, 'THE FULL PICTURE', 'Design scope',
        'Everything in scope for the room build — chosen from the Sonor design library and confirmed with this proposal. Free-form detail is carried in the joinery notes.');
      y0 = Math.max(y0, 186);
      var colW = (A4.w - M * 2 - 28) / 2;
      var x = M, y = y0, maxY = A4.h - M * 0.62 - 40;
      (m.optionGroups || []).forEach(function (gr) {
        var need = 26 + gr.names.length * 18 + 16;
        if (y + need > maxY && x === M) { x = M + colW + 28; y = y0; }
        P.tracked(String(gr.label).toUpperCase(), x, y, 6.5, F.r, COL.MUT, 1.5);
        P.hline(x, x + colW, y + 11, COL.GOLD, 0.8, 0.75);
        y += 26;
        gr.names.forEach(function (n, i, arr) {
          P.dot(x + 3, y - 4, 2.2, COL.GOLD);
          P.text(n, x + 14, y - 9, 10, F.b, COL.INK);
          if (i < arr.length - 1) P.hline(x, x + colW, y + 4, COL.LINE, 0.5, 0.6);
          y += 18;
        });
        y += 16;
      });
      lx.pageFoot(P, F);
    };
  }

  // ── v0.7.0 — BRAND PAGES (MK Sound / Sonance / Wisdom Audio) ──────────────
  // Brochure-style: typographic wordmark hero (no official logo assets in the
  // Library yet — Library ask logged; drops in automatically once curated as a
  // 'brand' catalogue row with an image), brief story + fact rows. Every page
  // renders ONLY when that system is actually selected. All copy ligature-safe.
  var BRANDS = {
    mk: {
      name: 'MK Sound', wordmark: 'MK SOUND', strap: 'THE STUDIO REFERENCE · SINCE 1974',
      eyebrow: 'BRAND STORY',
      intro: 'Miller & Kreisel created the powered subwoofer and the satellite-sub system in Los Angeles in 1974 — and their monitors became the reference in the dubbing stages where films are actually mixed.',
      paras: [
        'Films, series and games are mixed on MK Sound monitors every day. Choosing MK for your cinema means the soundtrack plays back on the same voicing it was created on — dialogue, dynamics and detail exactly as the mixer intended.',
        'Precise imaging, high dynamic capability and push-pull dual-driver subwoofers are the MK signature — engineered for reference level in real rooms, not just the lab.'
      ],
      facts: [
        ['Founded', '1974 · Los Angeles, California'],
        ['Heritage', 'Studio monitor reference — THX pioneer'],
        ['Signature', 'Push-pull dual-driver subwoofers · precise imaging'],
        ['In your cinema', 'Loudspeaker package across the channel groups']
      ]
    },
    sonance: {
      name: 'Sonance', wordmark: 'SONANCE', strap: 'ARCHITECTURAL AUDIO · SINCE 1983',
      eyebrow: 'BRAND STORY',
      intro: 'Sonance pioneered architectural audio from San Clemente, California in 1983 — loudspeakers and amplification designed to disappear into the room while the sound fills it.',
      paras: [
        'Sonance amplification pairs high-current Class-D power with cool, quiet, rack-mounted engineering — driving every channel with headroom to spare and total reliability over long sessions.',
        'In a dedicated cinema, Sonance power amplification partners the processor to deliver clean, unstrained level to each loudspeaker — matched, calibrated and invisible.'
      ],
      facts: [
        ['Founded', '1983 · San Clemente, California'],
        ['Heritage', 'The original architectural audio marque'],
        ['Signature', 'High-current amplification · engineered to disappear'],
        ['In your cinema', 'Power amplification behind the loudspeaker system']
      ]
    },
    wisdom: {
      name: 'Wisdom Audio', wordmark: 'WISDOM AUDIO', strap: 'PLANAR MAGNETIC LINE SOURCE · CARSON CITY, NEVADA',
      eyebrow: 'BRAND STORY',
      intro: 'Wisdom Audio hand-builds planar magnetic line-source loudspeakers in Carson City, Nevada — systems that live inside the wall and energise the whole seating area evenly, at reference level, without strain.',
      paras: [
        'A line source behaves unlike a conventional speaker: level stays even from the front row to the back, and the room fades away. Combined with dedicated system engineering, a Wisdom cinema is specified end to end for the room it serves.',
        'This is the tier beyond platinum — the loudspeaker system the rest of the design is built around.'
      ],
      facts: [
        ['Founded', '1996 · Carson City, Nevada'],
        ['Heritage', 'Planar magnetic line-source pioneer'],
        ['Signature', 'In-wall line sources · even level at every seat'],
        ['Status', 'System selection TBC — pending the Habitech experience centre visit']
      ]
    }
  };
  function secBrand(m, key) {
    if (!m.brandPages || m.brandPages.indexOf(key) < 0) return null;
    var B = BRANDS[key];
    if (!B) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, B.name.toUpperCase(), pageNo, TOTAL, DOC_LABEL);
      var y = lx.sectionHead(P, F, B.eyebrow, B.name, B.intro);
      y = Math.max(y, 196);
      // hero band — typographic wordmark on the house dark ground
      var hw = A4.w - M * 2, hh = 132;
      P.rect(M, y, hw, hh, COL.DARK, 1);
      P.rectB(M, y, hw, hh, COL.GOLD, 0.9, 0.55);
      P.center(B.wordmark, A4.w / 2, y + hh / 2 - 22, 25, F.b, COL.CREAM, 6);
      P.hline(A4.w / 2 - 60, A4.w / 2 + 60, y + hh / 2 + 16, COL.GOLD, 0.9, 0.9);
      P.center(B.strap, A4.w / 2, y + hh / 2 + 26, 6.5, F.r, COL.GOLDL, 2.2);
      y += hh + 26;
      // story paragraphs
      (B.paras || []).forEach(function (t) {
        lx.wrap(t, F.r, 10.5, A4.w - M * 2).forEach(function (ln) {
          P.text(ln, M, y - 9, 10.5, F.r, COL.INK2); y += 15;
        });
        y += 8;
      });
      y += 6;
      lx.specRows(P, F, B.facts || [], M, y, A4.w - M * 2 - 40);
      lx.pageFoot(P, F);
    };
  }

  function secDetail(m) {
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'THE DETAIL', pageNo, TOTAL, DOC_LABEL);
      P.tracked('THE DETAIL', M, 92, 8.5, F.r, COL.GOLD, 2.6);
      var y = 118;
      (m.termsLines || []).forEach(function (t) {
        P.dot(M + 3, y - 3, 2.2, COL.GOLD);
        var lines = lx.wrap(t, F.r, 10.5, A4.w - M * 2 - 18);
        lines.forEach(function (ln, li) { P.text(ln, M + 14, y - 9 + li * 14.5, 10.5, F.r, COL.INK2); });
        y += lines.length * 14.5 + 12;
      });
      // reference — alone near the foot (seating terms-page anatomy)
      if (m.quoteRef) {
        P.hline(M, A4.w - M, A4.h - 130, COL.LINE, 0.8);
        P.tracked('PROPOSAL REFERENCE', M, A4.h - 116, 6.5, F.r, COL.MUT, 1.5);
        P.text(m.quoteRef, M, A4.h - 106, 14, F.b, COL.INK);
        P.text('Please quote this reference in any correspondence about this proposal.', M, A4.h - 86, 8.5, F.r, COL.MUT);
        if (m.dateText) P.right(m.dateText, A4.w - M, A4.h - 112, 9.5, F.r, COL.MUT);
      }
      lx.pageFoot(P, F);
    };
  }

  async function generate(m) {
    var lx = L();
    if (!lx) throw new Error('SonorPdfLuxury master not loaded');
    var PL = global.PDFLib;
    var doc = await PL.PDFDocument.create();
    var F = await lx.makeFonts(doc, BASE);

    // cover assets — SAME image + logos as the seating proposal
    var hero = null, cedia = null, fadeImg = null;
    var heroUrl = m.heroImage || (BASE + '../venice-double-seats.png');
    try { hero = await lx.loadImage(doc, heroUrl); } catch (e) {}
    try { cedia = await lx.loadImage(doc, BASE + 'cedia-member-stacked.png'); } catch (e) {}
    try { var fd = lx.fadePngDataUrl(); if (fd) fadeImg = await doc.embedPng(await lx.fetchBytes(fd)); } catch (e) {}

    var swatchImgs = [];
    for (var i = 0; i < (m.slots || []).length; i++) {
      var s = m.slots[i]; var im = null;
      if (s.swatchImg) { try { im = await lx.loadImage(doc, s.swatchImg); } catch (e) {} }
      swatchImgs.push(im);
    }
    // design concept renders (projects.metadata.design_renders)
    var renderImgs = [];
    for (var ri = 0; ri < (m.renders || []).length && ri < 3; ri++) {
      var rr = m.renders[ri]; var rim = null;
      if (rr && rr.url) { try { rim = await lx.loadImage(doc, rr.url); } catch (e) {} }
      renderImgs.push(rim);
    }

    // assemble sections (nulls dropped), then paint with true page numbers
    var sections = [
      { label: 'Introduction', draw: secIntro(m) },
      { label: 'Design concepts', draw: secConcepts(m, renderImgs) },
      { label: 'Video system', draw: secVideo(m) },
      { label: 'Audio system', draw: secAudio(m) },
      { label: 'MK Sound', draw: secBrand(m, 'mk') },
      { label: 'Sonance', draw: secBrand(m, 'sonance') },
      { label: 'Wisdom Audio', draw: secBrand(m, 'wisdom') },
      { label: 'Lighting', draw: secLighting(m) },
      { label: 'LED lighting', draw: secLed(m) },
      { label: 'Star ceiling', draw: secStar(m) },
      { label: 'Materials & finishes', draw: secBoard(m, swatchImgs) },
      { label: 'Design scope', draw: secScope(m) },
      { label: 'Joinery & sundries', draw: secJoinery(m) },
      { label: 'The detail', draw: secDetail(m) }
    ].filter(function (s) { return s.draw; });
    m.sectionList = sections.map(function (s) { return s.label; });

    var TOTAL = sections.length + 1;
    var p1 = doc.addPage([lx.A4.w, lx.A4.h]);
    lx.cover(lx.mk(p1, doc), F, {
      hero: hero, fadeImg: fadeImg, cediaImg: cedia,
      eyebrow: DOC_LABEL,
      title: m.title || 'Your Cinema',
      subtitle: 'by Sonor',
      info: [['PREPARED FOR', m.client || '—'], ['PROJECT', m.project || '—'], ['REFERENCE', m.quoteRef || '—']]
    });
    sections.forEach(function (s, idx) {
      var pg = doc.addPage([lx.A4.w, lx.A4.h]);
      s.draw(lx.mk(pg, doc), F, idx + 2, TOTAL);
    });

    var bytes = await doc.save();
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = m.filename || 'sonor-cinema-design-proposal.pdf';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return true;
  }

  global.AestheticPdf = {
    generate: generate,
    available: function () { return !!(global.PDFLib && global.PDFLib.PDFDocument && global.SonorPdfLuxury); }
  };
})(window);
