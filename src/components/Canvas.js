// src/components/Canvas.js
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback
} from 'react';
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Arrow,
  Circle,
  Group,
  Line,
  Rect,
  Text,
  Transformer
} from 'react-konva';
import useImage from 'use-image';

/*
 Props:
  - toolMode: 'force' | 'moment-cw' | 'moment-ccw' | 'eraser' | 'zone-add' | null
  - clearSignal: number
  - mainImage: string (no-support image)
  - referenceImage: string (supports image thumbnail)
  - devMode: boolean
  - downloadTrigger: number
  - fitPadding?: number
  - showCanvasBorder?: boolean
  - initialSupportRegions: array | { regions: [...] }
  - lockedArrowsNorm?: array   // read-only carry-over (normalized to current image)
  - lockedMomentsNorm?: array  // read-only (normalized)
*/
const MIN_ZONE_SIZE = 10;
const DEFAULT_FIT_PADDING = 150;

const Canvas = forwardRef(function Canvas(
  {
    toolMode,
    clearSignal,
    mainImage,
    referenceImage,
    devMode = false,
    downloadTrigger = 0,
    fitPadding = DEFAULT_FIT_PADDING,
    showCanvasBorder = true,
    initialSupportRegions,
    lockedArrowsNorm = [],
    lockedMomentsNorm = [],
    muteZoneIds = [],
    enforceCouples = true
  },
  ref
) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  // assets
  const [structureImage] = useImage(mainImage);
  const [refImage] = useImage(referenceImage);
  const [momentCWImage] = useImage(process.env.PUBLIC_URL + '/images/cw_moment.png');
  const [momentCCWImage] = useImage(process.env.PUBLIC_URL + '/images/ccw_moment.png');

  // layout
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageDraw, setImageDraw] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // drawing state
  const [arrows, setArrows] = useState([]);
  const [moments, setMoments] = useState([]);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [newArrow, setNewArrow] = useState(null);
  const [selectedArrowId, setSelectedArrowId] = useState(null);

  // zones
  const [supports, setSupports] = useState([]);

  // Load solution regions from JSON (array or { regions: [...] })
  useEffect(() => {
    if (!initialSupportRegions) return;
    const regions = Array.isArray(initialSupportRegions)
      ? initialSupportRegions
      : (initialSupportRegions.regions || []);
    if (regions.length) {
      const withIds = regions.map((z, i) => ({ id: z.id || `zone_${i}`, rotationDeg: z.rotationDeg || 0, ...z }));
      setSupports(withIds);
    } else {
      setSupports([]);
    }
  }, [initialSupportRegions]);

  const [drawingRect, setDrawingRect] = useState(null);
  const [selectedSupportId, setSelectedSupportId] = useState(null);
  const [hoverSupportId, setHoverSupportId] = useState(null);
  const groupRefs = useRef({});   // group (draggable/rotatable) per zone id
  const boxRefs = useRef({});     // inner Rect per zone id
  const dragCache = useRef({});

  const [thumbOpen, setThumbOpen] = useState(false);

  const getStageRectPx = useCallback(() => ({
    left: 0,
    top: 0,
    right: canvasSize.width,
    bottom: canvasSize.height,
    w: canvasSize.width,
    h: canvasSize.height
  }), [canvasSize]);

  const angleDeg = (start, end) =>
    ((Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 360) % 360;

  const lengthPx = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Normalize angle into [0,360)
  const normDeg = (d) => ((d % 360) + 360) % 360;

  /**
   * Check if an angle (degrees) is inside any of the [lo,hi] ranges (degrees).
   * Ranges may wrap across 0/360 (e.g., [350, 10]).
   */
  const isAngleInRanges = (theta, ranges) => {
    if (!ranges || ranges.length === 0) return true;
    const t = normDeg(theta);
    return ranges.some(([a, b]) => {
      const lo = normDeg(a);
      const hi = normDeg(b);
      if (lo <= hi) return t >= lo && t <= hi;
      // wrapped interval
      return t >= lo || t <= hi;
    });
  };

  const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  const segIntersects = (A, B, C, D) =>
    (ccw(A, C, D) !== ccw(B, C, D)) && (ccw(A, B, C) !== ccw(A, B, D));

  // ===== Rotated-rect utilities =====
  const degToRad = (d) => (d * Math.PI) / 180;

  const rotatePointAround = (p, center, deg) => {
    const a = -degToRad(deg); // inverse rotate for hit-test
    const cos = Math.cos(a), sin = Math.sin(a);
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  };

  const pointInAARect = (p, r) =>
    p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

  const segmentIntersectsAARect = (P, Q, rect) => {
    if (pointInAARect(P, rect) || pointInAARect(Q, rect)) return true;
    const R1 = { x: rect.x, y: rect.y };
    const R2 = { x: rect.x + rect.width, y: rect.y };
    const R3 = { x: rect.x + rect.width, y: rect.y + rect.height };
    const R4 = { x: rect.x, y: rect.y + rect.height };
    return (
      segIntersects(P, Q, R1, R2) ||
      segIntersects(P, Q, R2, R3) ||
      segIntersects(P, Q, R3, R4) ||
      segIntersects(P, Q, R4, R1)
    );
  };

  const pointInRotRect = (p, rect, rotationDeg) => {
    if (!rotationDeg) return pointInAARect(p, rect);
    const c = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const pr = rotatePointAround(p, c, rotationDeg);
    return pointInAARect(pr, rect);
  };

  const segmentIntersectsRotRect = (P, Q, rect, rotationDeg) => {
    if (!rotationDeg) return segmentIntersectsAARect(P, Q, rect);
    const c = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const P2 = rotatePointAround(P, c, rotationDeg);
    const Q2 = rotatePointAround(Q, c, rotationDeg);
    return segmentIntersectsAARect(P2, Q2, rect);
  };

  const dirToAngleRanges = (dirOrDirs) => {
    const Y_DOWN = true;
    const one = (dir) => {
      const tol = 10;
      switch ((dir || '').toLowerCase()) {
        case 'up': return [[(Y_DOWN ? 270 : 90) - tol, (Y_DOWN ? 270 : 90) + tol]];
        case 'down': return [[(Y_DOWN ? 90 : 270) - tol, (Y_DOWN ? 90 : 270) + tol]];
        case 'left': return [[180 - tol, 180 + tol]];
        case 'right': return [[-tol, tol], [360 - tol, 360]];
        default: return null;
      }
    };
    if (Array.isArray(dirOrDirs)) return dirOrDirs.map(one).filter(Boolean).flat();
    return one(dirOrDirs);
  };

  const normToPxRect = (z) => {
    const { x, y, w, h } = imageDraw;
    const iw = w || 1;
    const ih = h || 1;
    return {
      x: x + z.x * iw,
      y: y + z.y * ih,
      width: z.width * iw,
      height: z.height * ih
    };
  };

  const pxRectToNorm = (r) => {
    const { x, y, w, h } = imageDraw;
    const iw = w || 1;
    const ih = h || 1;

    const nx = (r.x - x) / iw;
    const ny = (r.y - y) / ih;

    const minWn = MIN_ZONE_SIZE / iw;
    const minHn = MIN_ZONE_SIZE / ih;

    const nw = Math.max(minWn, r.width / iw);
    const nh = Math.max(minHn, r.height / ih);

    return {
      x: Number.isFinite(nx) ? nx : 0,
      y: Number.isFinite(ny) ? ny : 0,
      width: Number.isFinite(nw) ? nw : minWn,
      height: Number.isFinite(nh) ? nh : minHn,
    };
  };

  const normToPxPoint = (pN) => {
    const nx = Number.isFinite(pN?.x) ? pN.x : null;
    const ny = Number.isFinite(pN?.y) ? pN.y : null;
    if (nx === null || ny === null) {
      console.warn('[normToPxPoint] bad normalized coords', pN, imageDraw);
      return { x: -9999, y: -9999 };
    }
    return {
      x: imageDraw.x + nx * (imageDraw.w || 1),
      y: imageDraw.y + ny * (imageDraw.h || 1),
    };
  };

  const extendArrow = (s, e, scale = 2.0, minExtraPx = 24) => {
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const L = Math.hypot(dx, dy) || 1;
    const targetL = Math.max(L * scale, L + minExtraPx);
    const fx = (targetL / L) * dx;
    const fy = (targetL / L) * dy;
    return { sx: s.x, sy: s.y, ex: s.x + fx, ey: s.y + fy };
  };

  useEffect(() => {
    let raf = null;

    const updateFromContainer = () => {
      const el = containerRef.current;
      if (!el) return;

      const width = Math.floor(el.clientWidth);
      const height = Math.floor(el.clientHeight);

      setCanvasSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );

      if (structureImage && width > 0 && height > 0) {
        const padding = Math.max(0, fitPadding);
        const availW = Math.max(100, width - padding * 2);
        const availH = Math.max(100, height - padding * 2);
        const scale = Math.min(availW / structureImage.width, availH / structureImage.height);
        const w = Math.round(structureImage.width * scale);
        const h = Math.round(structureImage.height * scale);
        const x = Math.round((width - w) / 2);
        const y = Math.round((height - h) / 2);
        setImageDraw((prev) =>
          prev.x === x && prev.y === y && prev.w === w && prev.h === h ? prev : { x, y, w, h }
        );
      }
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFromContainer);
    };

    const ro = new ResizeObserver(schedule);
    if (containerRef.current) ro.observe(containerRef.current);

    schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [structureImage, fitPadding]);

  // ---- DPR stabilizer ----
  const getStableDPR = () => {
    const dpr = window.devicePixelRatio || 1;
    return Math.round(dpr * 20) / 20;
  };
  const [pixelRatio, setPixelRatio] = useState(getStableDPR());
  useEffect(() => {
    const update = () => setPixelRatio(getStableDPR());
    window.addEventListener('resize', update, { passive: true });
    let mm;
    if (window.matchMedia) {
      try {
        mm = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        if (mm?.addEventListener) mm.addEventListener('change', update);
        else if (mm?.addListener) mm.addListener(update);
      } catch {}
    }
    return () => {
      window.removeEventListener('resize', update);
      if (mm?.removeEventListener) mm.removeEventListener('change', update);
      else if (mm?.removeListener) mm.removeListener?.(update);
    };
  }, []);
  // ---- end DPR stabilizer ----

  // Stable callbacks
  const finalizeZoneAdd = useCallback(() => {
    if (!drawingRect) return;

    const stg = getStageRectPx();

    const x0 = drawingRect.width < 0 ? drawingRect.x + drawingRect.width : drawingRect.x;
    const y0 = drawingRect.height < 0 ? drawingRect.y + drawingRect.height : drawingRect.y;
    const w0 = Math.max(MIN_ZONE_SIZE, Math.abs(drawingRect.width));
    const h0 = Math.max(MIN_ZONE_SIZE, Math.abs(drawingRect.height));

    const x1 = Math.max(stg.left, Math.min(stg.right - MIN_ZONE_SIZE, x0));
    const y1 = Math.max(stg.top, Math.min(stg.bottom - MIN_ZONE_SIZE, y0));
    const x2 = Math.max(stg.left + MIN_ZONE_SIZE, Math.min(stg.right, x0 + w0));
    const y2 = Math.max(stg.top + MIN_ZONE_SIZE, Math.min(stg.bottom, y0 + h0));

    const rectPx = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.max(MIN_ZONE_SIZE, Math.abs(x2 - x1)),
      height: Math.max(MIN_ZONE_SIZE, Math.abs(y2 - y1))
    };

    if (imageDraw.w > 0 && imageDraw.h > 0) {
      const norm = pxRectToNorm(rectPx);
      const id = `zone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setSupports((prev) => [...prev, { id, rotationDeg: 0, ...norm }]);
    }
    setDrawingRect(null);
  }, [drawingRect, getStageRectPx, imageDraw, pxRectToNorm]);

  const finalizeArrow = useCallback(() => {
    if (!isDrawingArrow || !newArrow) return;
    setArrows((prev) => [...prev, newArrow]);
    setNewArrow(null);
    setIsDrawingArrow(false);
  }, [isDrawingArrow, newArrow]);

  // Ref bridge so global listeners don't need these in their deps
  const finalizeArrowRef = useRef(() => {});
  const finalizeZoneAddRef = useRef(() => {});
  useEffect(() => {
    finalizeArrowRef.current = finalizeArrow;
    finalizeZoneAddRef.current = finalizeZoneAdd;
  }, [finalizeArrow, finalizeZoneAdd]);

  // Global mouseup/touchend (no hook deps warning)
  useEffect(() => {
    const onUp = () => {
      finalizeZoneAddRef.current();
      finalizeArrowRef.current();
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  useEffect(() => {
    setArrows([]);
    setMoments([]);
    setSelectedArrowId(null);
  }, [clearSignal]);

  useEffect(() => {
    if (!downloadTrigger) return;

    const payload = {
      regions: supports,
      imageDraw,
      meta: { generatedAt: new Date().toISOString(), version: 1 }
    };

    try {
      const data = JSON.stringify(payload, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'support_regions.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      const safe = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const a = document.createElement('a');
      a.href = safe;
      a.download = 'support_regions.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [downloadTrigger, supports, imageDraw]);

  useImperativeHandle(ref, () => ({
    checkSubmission: () => {
      if (!structureImage || !supports || supports.length === 0) {
        return {
          overallCorrect: false,
          jointFeedback: [],
          extras: [],
          extrasInsideAny: [],
          extrasOutsideAny: [],
          missingZones: [],
          extraElementsNotice: false
        };
      }

      const toNorm = (pt) => ({
        x: (pt.x - imageDraw.x) / imageDraw.w,
        y: (pt.y - imageDraw.y) / imageDraw.h
      });

      const student = [
        ...arrows.map((a) => ({
          kind: 'force',
          startPx: a.start,
          endPx: a.end,
          start: toNorm(a.start),
          end: toNorm(a.end),
        })),
        ...moments.map((m) => ({
          kind: 'moment',
          centerPx: { x: m.x, y: m.y },
          center: toNorm({ x: m.x, y: m.y }),
          direction: m.type === 'moment-cw' ? 'cw' : 'ccw'
        }))
      ];

      const muteSet = new Set(muteZoneIds);

      const zonesRaw = supports.map((z, i) => {
        const id = z.id || `zone_${i}`;
        const rectPx = {
          x: imageDraw.x + z.x * imageDraw.w,
          y: imageDraw.y + z.y * imageDraw.h,
          width: z.width * imageDraw.w,
          height: z.height * imageDraw.h
        };
        return {
          id,
          rectPx,
          rotationDeg: z.rotationDeg || 0,
          type: z.type || null,
          angleRangesDeg: z.angleRangesDeg || dirToAngleRanges(z.forceDirection) || null,
          momentDirection: z.momentDirection || null,
          minLengthPx: z.minLengthPx || 20,
          joint: z.joint || null
        };
      });

      // skip muted
      const zones = zonesRaw.filter(z => !muteSet.has(z.id));

      const candidates = [];
      zones.forEach((zone, zi) => {
        student.forEach((el, ei) => {
          if (zone.type) {
            if (zone.type === 'force' && el.kind !== 'force') return;
            if (zone.type === 'moment' && el.kind !== 'moment') return;
          }
          if (el.kind === 'force') {
            const passes = segmentIntersectsRotRect(el.startPx, el.endPx, zone.rectPx, zone.rotationDeg || 0);
            if (!passes) return;
            const L = lengthPx(el.startPx, el.endPx);
            if (L < zone.minLengthPx) return;
            const theta = angleDeg(el.startPx, el.endPx);
            if (!isAngleInRanges(theta, zone.angleRangesDeg)) return;
            candidates.push({ zi, ei });
          } else if (el.kind === 'moment') {
            const cPx = el.centerPx;
            if (!pointInRotRect(cPx, zone.rectPx, zone.rotationDeg || 0)) return;
            if (zone.momentDirection) {
              const allowedRaw = Array.isArray(zone.momentDirection)
                ? zone.momentDirection
                : [zone.momentDirection];
              const allowed = allowedRaw.map(s => String(s).trim().toLowerCase());
              const dir = String(el.direction || '').trim().toLowerCase();
              if (!(allowed.includes('any') || allowed.includes(dir))) return;
            }
            candidates.push({ zi, ei });
          }
        });
      });

      const usedZ = new Set();
      const usedE = new Set();
      for (const c of candidates) {
        if (usedZ.has(c.zi) || usedE.has(c.ei)) continue;
        usedZ.add(c.zi);
        usedE.add(c.ei);
      }

      const missingZoneIdx = zones.map((_, i) => i).filter((i) => !usedZ.has(i));
      const extraElemIdx = student.map((_, i) => i).filter((i) => !usedE.has(i));

      const elTouchesZone = (el, z) => {
        if (el.kind === 'force') return segmentIntersectsRotRect(el.startPx, el.endPx, z.rectPx, z.rotationDeg || 0);
        return pointInRotRect(el.centerPx, z.rectPx, z.rotationDeg || 0);
      };
      const isInAnyZone = (el) => zones.some((z) => elTouchesZone(el, z));
      const extrasInsideAny = extraElemIdx.filter((i) => isInAnyZone(student[i]));
      const extrasOutsideAny = extraElemIdx.filter((i) => !isInAnyZone(student[i]));

      const jointsMap = new Map();
      zones.forEach((z, i) => {
        if (!z.joint?.name) return;
        const key = z.joint.name;
        if (!jointsMap.has(key)) jointsMap.set(key, { type: z.joint.type || null, zoneIdx: [], matchedIdx: [], extrasInJoint: [] });
        jointsMap.get(key).zoneIdx.push(i);
      });
      for (const info of jointsMap.values()) {
        info.matchedIdx = info.zoneIdx.filter((zi) => usedZ.has(zi));
      }
      for (const ei of extraElemIdx) {
        const el = student[ei];
        for (const info of jointsMap.values()) {
          const inAny = info.zoneIdx.some((zi) => elTouchesZone(el, zones[zi]));
          if (inAny) info.extrasInJoint.push(ei);
        }
      }

      const jointIssues = [];
      for (const [name, info] of jointsMap.entries()) {
        const totalReq = info.zoneIdx.length;
        const got = info.matchedIdx.length;
        const missing = Math.max(0, totalReq - got);
        const extras = info.extrasInJoint.length;
        if (missing > 0 || extras > 0) {
          const reasons = [];
          if (missing > 0) reasons.push(`${missing} reaction${missing > 1 ? 's' : ''} missing`);
          if (extras > 0) reasons.push(`${extras} extra reaction${extras > 1 ? 's' : ''} in region`);
          jointIssues.push({
            joint: { name, type: info.type || null },
            message: reasons.join(' | ')
          });
        }
      }
      const jointsAllSatisfied = jointIssues.length === 0;
      const extraElementsNotice =
        jointsAllSatisfied &&
        missingZoneIdx.length === 0 &&
        extrasOutsideAny.length > 0 &&
        extrasInsideAny.length === 0;

      let overallCorrect = missingZoneIdx.length === 0 && extraElemIdx.length === 0;

      if (enforceCouples) {
        const zoneToElem = new Map();
        zones.forEach((_, zi) => zoneToElem.set(zi, null));
        candidates.forEach(({ zi, ei }) => {
          if (usedZ.has(zi) && usedE.has(ei) && zoneToElem.get(zi) === null) {
            zoneToElem.set(zi, ei);
          }
        });

        const angDiff = (a, b) => {
          const d = Math.abs(a - b) % 360;
          return d > 180 ? 360 - d : d;
        };
        const angleOfElem = (el) => (el.kind === 'force' ? angleDeg(el.startPx, el.endPx) : null);

        const AXIS_TOL = 20;
        const angleToAxisSign = (deg) => {
          const a = (deg + 360) % 360;
          if (Math.min(angDiff(a, 0), angDiff(a, 180)) <= AXIS_TOL) {
            return { axis: 'x', sign: (angDiff(a, 0) < angDiff(a, 180)) ? +1 : -1 };
          }
          if (Math.min(angDiff(a, 90), angDiff(a, 270)) <= AXIS_TOL) {
            return { axis: 'y', sign: (angDiff(a, 90) < angDiff(a, 270)) ? +1 : -1 };
          }
          return { axis: null, sign: 0 };
        };

        const dirToAxis = (dir) => {
          const d = (dir || '').toLowerCase();
          if (d === 'left' || d === 'right') return 'x';
          if (d === 'up' || d === 'down') return 'y';
          return null;
        };
        const rangesToAxis = (ranges) => {
          if (!Array.isArray(ranges) || ranges.length === 0) return null;
          const [lo, hi] = ranges[0];
          const mid = (((lo + hi) / 2) + 360) % 360;
          if (Math.min(angDiff(mid, 0), angDiff(mid, 180)) <= AXIS_TOL) return 'x';
          if (Math.min(angDiff(mid, 90), angDiff(mid, 270)) <= AXIS_TOL) return 'y';
          return null;
        };

        const splitJoint = (jn, jointObj) => {
          if (!jn) return { base: null, member: null };
          const at = jn.indexOf('@');
          if (at >= 0) {
            return { base: jn.slice(0, at), member: jn.slice(at + 1) || null };
          }
          return { base: jn, member: jointObj?.member || jointObj?.side || null };
        };

        const zonesByBase = new Map();
        zones.forEach((z, zi) => {
          const jn = z.joint?.name || null;
          const { base, member } = splitJoint(jn, z.joint);
          if (!base) return;
          if (!zonesByBase.has(base)) zonesByBase.set(base, []);
          let zoneAxis = null;
          if (z.forceDirection) {
            const dirs = Array.isArray(z.forceDirection) ? z.forceDirection : [z.forceDirection];
            zoneAxis = dirToAxis(dirs[0]);
          } else if (z.angleRangesDeg) {
            zoneAxis = rangesToAxis(z.angleRangesDeg);
          }
          zonesByBase.get(base).push({ zi, z, base, member: member || 'member?', zoneAxis });
        });

        for (const [baseName, zlist] of zonesByBase.entries()) {
          const forceZones = zlist.filter(({ z }) => (z.type || 'force') === 'force');
          if (forceZones.length < 2) continue;

          const membersPerAxis = { x: new Set(), y: new Set() };
          forceZones.forEach(({ member, zoneAxis }) => {
            if (zoneAxis === 'x') membersPerAxis.x.add(member);
            if (zoneAxis === 'y') membersPerAxis.y.add(member);
          });
          const requiredAxes = new Set();
          if (membersPerAxis.x.size >= 2) requiredAxes.add('x');
          if (membersPerAxis.y.size >= 2) requiredAxes.add('y');

          const matchedPerMember = new Map();
          forceZones.forEach(({ zi, member }) => {
            const ei = zoneToElem.get(zi);
            if (ei === null || ei === undefined) return;
            const el = student[ei];
            if (el?.kind !== 'force') return;
            const ang = angleOfElem(el);
            const cls = angleToAxisSign(ang);
            if (!cls.axis) return;
            if (!matchedPerMember.has(member)) matchedPerMember.set(member, []);
            matchedPerMember.get(member).push(cls);
          });

          const axisFailed = [];
          for (const axis of requiredAxes) {
            const signsByMember = new Map();
            for (const [member, list] of matchedPerMember.entries()) {
              const signs = list.filter((c) => c.axis === axis).map((c) => c.sign);
              if (signs.length > 0) signsByMember.set(member, new Set(signs));
            }
            if (signsByMember.size < 2) {
              axisFailed.push(axis);
              continue;
            }
            const members = Array.from(signsByMember.keys());
            let ok = false;
            for (let i = 0; i < members.length && !ok; i++) {
              for (let j = i + 1; j < members.length && !ok; j++) {
                const A = signsByMember.get(members[i]);
                const B = signsByMember.get(members[j]);
                if ((A.has(+1) && B.has(-1)) || (A.has(-1) && B.has(+1))) ok = true;
              }
            }
            if (!ok) axisFailed.push(axis);
          }

          if (axisFailed.length > 0) {
            const label = axisFailed.sort().join('&');
            jointIssues.push({
              joint: { name: baseName, type: 'couple' },
              message: `couple: missing or not opposite on axis ${label}`,
            });
          }
        }

        const hasCoupleErrors = jointIssues.some((j) => j.joint?.type === 'couple');
        const recomputeOverall =
          missingZoneIdx.length === 0 &&
          extraElemIdx.length === 0 &&
          !hasCoupleErrors;
        overallCorrect = recomputeOverall;
      }

      return {
        overallCorrect,
        jointFeedback: jointIssues.sort((a, b) => a.joint.name.localeCompare(b.joint.name)),
        extras: extraElemIdx,
        extrasInsideAny,
        extrasOutsideAny,
        missingZones: missingZoneIdx,
        extraElementsNotice
      };
    },

    getState: () => {
      return { arrows, moments, supports };
    },

    __getImageDraw: () => imageDraw
  }));

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const targetName = e.target?.name?.() || '';

    if (e.target === stage) {
      setSelectedArrowId(null);
      if (devMode && toolMode !== 'zone-add' && toolMode !== 'eraser') setSelectedSupportId(null);
    }

    if (devMode && toolMode === 'zone-add') {
      if (e.target === stage || targetName === 'main-image') {
        const stg = getStageRectPx();
        const cx = Math.max(stg.left, Math.min(stg.right, pos.x));
        const cy = Math.max(stg.top, Math.min(stg.bottom, pos.y));
        setDrawingRect({ x: cx, y: cy, width: 0, height: 0 });
      }
      return;
    }

    if (toolMode === 'force') {
      setNewArrow({ id: Date.now(), start: pos, end: pos });
      setIsDrawingArrow(true);
      setSelectedArrowId(null);
      return;
    }

    if (toolMode === 'moment-cw' || toolMode === 'moment-ccw') {
      const id = Date.now();
      setMoments((prev) => [...prev, { id, x: pos.x, y: pos.y, type: toolMode }]);
      setSelectedArrowId(null);
      return;
    }
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (devMode && toolMode === 'zone-add' && drawingRect) {
      const stg = getStageRectPx();
      const cx = Math.max(stg.left, Math.min(stg.right, pos.x));
      const cy = Math.max(stg.top, Math.min(stg.bottom, pos.y));
      setDrawingRect((prev) => prev && { x: prev.x, y: prev.y, width: cx - prev.x, height: cy - prev.y });
      return;
    }

    if (isDrawingArrow && newArrow) setNewArrow({ ...newArrow, end: pos });
  };

  const handleMouseUp = () => {
    if (devMode && toolMode === 'zone-add' && drawingRect) finalizeZoneAdd();
    if (isDrawingArrow && newArrow) finalizeArrow();
  };

  const handleArrowClick = (id, e) => {
    e.cancelBubble = true;
    if (toolMode === 'eraser') {
      setArrows((prev) => prev.filter((a) => a.id !== id));
      if (selectedArrowId === id) setSelectedArrowId(null);
    } else {
      setSelectedArrowId((prev) => (prev === id ? null : id));
    }
  };

  const handleEndpointDrag = (id, endKey) => (e) => {
    const pos = e.target.position();
    setArrows((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [endKey]: { x: pos.x, y: pos.y } } : a))
    );
  };

  const handleCenterDragMove = (id, e) => {
    const node = e.target;
    const newMid = { x: node.x(), y: node.y() };
    setArrows((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const midX = (a.start.x + a.end.x) / 2;
        const midY = (a.start.y + a.end.y) / 2;
        const dx = newMid.x - midX;
        const dy = newMid.y - midY;
        return {
          ...a,
          start: { x: a.start.x + dx, y: a.start.y + dy },
          end: { x: a.end.x + dx, y: a.end.y + dy }
        };
      })
    );
  };

  const onZoneDragStart = (z, e) => {
    const node = e.target;
    const cr = node.getClientRect({ skipShadow: true, skipStroke: false });
    dragCache.current[z.id] = { w: cr.width || node.width(), h: cr.height || node.height() };
  };

  const onZoneDragMove = (z, e) => {
    const node = e.target;
    const stg = getStageRectPx();
    const cr = node.getClientRect({ skipShadow: true, skipStroke: false });

    let dx = 0;
    let dy = 0;
    if (cr.x < stg.left) dx = stg.left - cr.x;
    if (cr.y < stg.top) dy = stg.top - cr.y;
    if (cr.x + cr.width > stg.right) dx = stg.right - (cr.x + cr.width);
    if (cr.y + cr.height > stg.bottom) dy = stg.bottom - (cr.y + cr.height);

    if (dx || dy) {
      node.x(node.x() + dx);
      node.y(node.y() + dy);
    }
  };

  const dragBoundFor = (id) => (pos) => {
    const stg = getStageRectPx();
    const sizes = dragCache.current[id];
    if (!sizes) return pos;
    const w = sizes.w;
    const h = sizes.h;
    const x = Math.max(stg.left, Math.min(stg.right - w, pos.x));
    const y = Math.max(stg.top, Math.min(stg.bottom - h, pos.y));
    return { x, y };
  };

  const showTooltip = !toolMode && arrows.length === 0 && moments.length === 0 && !devMode;

  const cursor =
    toolMode === 'zone-add' ? 'crosshair'
      : toolMode === 'eraser' ? 'not-allowed'
      : toolMode === 'force' ? 'cell'
      : toolMode?.startsWith('moment') ? 'copy'
      : 'default';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        userSelect: 'none',
        boxSizing: 'border-box',
        border: showCanvasBorder ? '2px solid #666' : 'none',
        overflow: 'hidden'
      }}
    >
      {showTooltip && (
        <div
          style={{
            position: 'absolute', top: 20, left: 20, background: '#fff8c6',
            border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px',
            zIndex: 30, boxShadow: '0 2px 4px rgba(0,0,0,0.08)', fontSize: 14
          }}
        >
          Select a tool from the right to begin.
        </div>
      )}

      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        pixelRatio={pixelRatio}
        style={{ background: '#fff', cursor }}
      >
        {/* Layer 1: image */}
        <Layer listening>
          {structureImage && (
            <KonvaImage
              name="main-image"
              image={structureImage}
              x={imageDraw.x}
              y={imageDraw.y}
              width={imageDraw.w}
              height={imageDraw.h}
              listening={true}
            />
          )}
        </Layer>

        {/* Layer 2: zones (Dev Mode only) */}
        {devMode && (
          <Layer>
            {supports.map((z) => {
              const px = normToPxRect(z);
              const isSelected = devMode && selectedSupportId === z.id;
              return (
                <React.Fragment key={z.id}>
                  {(() => {
                    const pxW = Math.max(px.width, MIN_ZONE_SIZE);
                    const pxH = Math.max(px.height, MIN_ZONE_SIZE);
                    const cx = px.x + pxW / 2;
                    const cy = px.y + pxH / 2;
                    const rot = Number.isFinite(z.rotationDeg) ? z.rotationDeg : 0;

                    return (
                      <Group
                        ref={(node) => { if (node) groupRefs.current[z.id] = node; }}
                        x={cx}
                        y={cy}
                        rotation={rot}
                        draggable={devMode && isSelected}
                        dragBoundFunc={dragBoundFor(z.id)}
                        onDragStart={(e) => onZoneDragStart(z, e)}
                        onDragMove={(e) => onZoneDragMove(z, e)}
                        onClick={(e) => {
                          if (!devMode) return;
                          e.cancelBubble = true;
                          if (toolMode === 'eraser') {
                            setSupports((prev) => prev.filter((s) => s.id !== z.id));
                            if (selectedSupportId === z.id) setSelectedSupportId(null);
                          } else {
                            setSelectedSupportId(z.id);
                          }
                        }}
                        onTap={(e) => {
                          if (!devMode) return;
                          e.cancelBubble = true;
                          if (toolMode === 'eraser') {
                            setSupports((prev) => prev.filter((s) => s.id !== z.id));
                            if (selectedSupportId === z.id) setSelectedSupportId(null);
                          } else {
                            setSelectedSupportId(z.id);
                          }
                        }}
                        onMouseEnter={() => setHoverSupportId(z.id)}
                        onMouseLeave={() => setHoverSupportId((h) => (h === z.id ? null : h))}
                      >
                        <Rect
                          ref={(node) => { if (node) boxRefs.current[z.id] = node; }}
                          x={-pxW / 2}
                          y={-pxH / 2}
                          width={pxW}
                          height={pxH}
                          fill="rgba(0,128,255,0.12)"
                          stroke={
                            isSelected
                              ? 'rgba(0,160,255,0.95)'
                              : (hoverSupportId === z.id ? 'rgba(0,128,255,0.95)' : 'rgba(0,128,255,0.7)')
                          }
                          strokeWidth={2}
                          strokeScaleEnabled={false}
                          perfectDrawEnabled={false}
                          listening={false}
                        />

                        {devMode && (
                          <Text
                            x={-pxW / 2 + 4}
                            y={-pxH / 2 + 4}
                            fontSize={12}
                            fill="#034"
                            listening={false}
                            text={
                              [
                                z.id ? `id:${z.id}` : '',
                                z.type ? `type:${z.type}` : '',
                                z.forceDirection
                                  ? `dir:${Array.isArray(z.forceDirection) ? z.forceDirection.join('|') : z.forceDirection}`
                                  : '',
                                z.momentDirection
                                  ? `M:${Array.isArray(z.momentDirection) ? z.momentDirection.join('|') : z.momentDirection}`
                                  : ''
                              ].filter(Boolean).join(' ')
                            }
                          />
                        )}
                      </Group>
                    );
                  })()}

                  {devMode && isSelected && groupRefs.current[z.id] && (
                    <Transformer
                      nodes={[groupRefs.current[z.id]]}
                      rotateEnabled={true}
                      anchorSize={8}
                      keepRatio={false}
                      flipEnabled={false}
                      ignoreStroke={true}
                      boundBoxFunc={(oldBox, newBox) => newBox}
                      onTransform={() => {
                        const g = groupRefs.current[z.id];
                        if (!g) return;
                        // keep group inside stage while transforming
                        const stg = getStageRectPx();
                        const cr = g.getClientRect({ skipShadow: true, skipStroke: false });
                        let dx = 0, dy = 0;
                        if (cr.x < stg.left) dx = stg.left - cr.x;
                        if (cr.y < stg.top) dy = stg.top - cr.y;
                        if (cr.x + cr.width > stg.right) dx = stg.right - (cr.x + cr.width);
                        if (cr.y + cr.height > stg.bottom) dy = stg.bottom - (cr.y + cr.height);
                        if (dx || dy) {
                          g.x(g.x() + dx);
                          g.y(g.y() + dy);
                        }
                      }}
                      onTransformEnd={() => {
                        const g = groupRefs.current[z.id];
                        const r = boxRefs.current[z.id];
                        if (!g || !r) return;

                        // bake scale into inner rect and reset group scale
                        const newW = Math.max(MIN_ZONE_SIZE, r.width() * g.scaleX());
                        const newH = Math.max(MIN_ZONE_SIZE, r.height() * g.scaleY());
                        r.width(newW);
                        r.height(newH);
                        r.x(-newW / 2);
                        r.y(-newH / 2);
                        g.scaleX(1);
                        g.scaleY(1);

                        // clamp inside stage after baking
                        const stg = getStageRectPx();
                        const cr = g.getClientRect({ skipShadow: true, skipStroke: false });
                        let dx = 0, dy = 0;
                        if (cr.x < stg.left) dx = stg.left - cr.x;
                        if (cr.y < stg.top) dy = stg.top - cr.y;
                        if (cr.x + cr.width > stg.right) dx = stg.right - (cr.x + cr.width);
                        if (cr.y + cr.height > stg.bottom) dy = stg.bottom - (cr.y + cr.height);
                        if (dx || dy) {
                          g.x(g.x() + dx);
                          g.y(g.y() + dy);
                        }

                        const cx = g.x();
                        const cy = g.y();
                        const rotationDeg = g.rotation() || 0;
                        const rectPx = { x: cx - newW / 2, y: cy - newH / 2, width: newW, height: newH };
                        if (imageDraw.w > 0 && imageDraw.h > 0) {
                          const norm = pxRectToNorm(rectPx);
                          setSupports((prev) =>
                            prev.map((s) => (s.id === z.id ? { ...s, ...norm, rotationDeg } : s))
                          );
                        }
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {devMode && toolMode === 'zone-add' && drawingRect && (
              <Rect
                x={drawingRect.width < 0 ? drawingRect.x + drawingRect.width : drawingRect.x}
                y={drawingRect.height < 0 ? drawingRect.y + drawingRect.height : drawingRect.y}
                width={Math.max(MIN_ZONE_SIZE, Math.abs(drawingRect.width))}
                height={Math.max(MIN_ZONE_SIZE, Math.abs(drawingRect.height))}
                fill="rgba(0,128,255,0.08)"
                stroke="rgba(0,128,255,0.7)"
                dash={[6, 4]}
              />
            )}
          </Layer>
        )}

        {/* Locked carry-over (read-only, normalized → pixels) */}
        <Layer listening={false}>
          {lockedArrowsNorm.map((a) => {
            const sPx = normToPxPoint(a.startN);
            const ePx = normToPxPoint(a.endN);
            const { sx, sy, ex, ey } = extendArrow(sPx, ePx, 2.0, 24);
            return (
              <Arrow
                key={a.id}
                points={[sx, sy, ex, ey]}
                stroke="#22c55e"
                fill="#22c55e"
                strokeWidth={5}
                pointerLength={16}
                pointerWidth={16}
                opacity={0.98}
                listening={false}
              />
            );
          })}

          {lockedMomentsNorm.map((m) => {
            const c = normToPxPoint({ x: m.xN, y: m.yN });
            const img = m.type === 'moment-cw' ? momentCWImage : momentCCWImage;
            if (img) {
              return (
                <KonvaImage
                  key={m.id}
                  image={img}
                  x={c.x}
                  y={c.y}
                  width={60}
                  height={60}
                  offset={{ x: 30, y: 30 }}
                  opacity={0.9}
                  listening={false}
                />
              );
            }
            return (
              <Group key={m.id} listening={false}>
                <Circle x={c.x} y={c.y} radius={14} fill="#bbb" stroke="#777" />
              </Group>
            );
          })}
        </Layer>

        {/* Layer 3: student arrows & moments */}
        <Layer>
          {arrows.map((a) => {
            const isSelected = selectedArrowId === a.id;
            const midX = (a.start.x + a.end.x) / 2;
            const midY = (a.start.y + a.end.y) / 2;
            return (
              <Group key={a.id}>
                <Arrow
                  points={[a.start.x, a.start.y, a.end.x, a.end.y]}
                  stroke="red"
                  fill="red"
                  strokeWidth={3}
                  pointerLength={10}
                  pointerWidth={10}
                  hitStrokeWidth={10}
                  onClick={(e) => handleArrowClick(a.id, e)}
                />
                {isSelected && (
                  <>
                    <Circle
                      x={a.start.x}
                      y={a.start.y}
                      radius={7}
                      fill="blue"
                      draggable
                      onDragMove={handleEndpointDrag(a.id, 'start')}
                    />
                    <Circle
                      x={a.end.x}
                      y={a.end.y}
                      radius={7}
                      fill="blue"
                      draggable
                      onDragMove={handleEndpointDrag(a.id, 'end')}
                    />
                    <Group x={midX} y={midY} draggable onDragMove={(e) => handleCenterDragMove(a.id, e)}>
                      <Circle radius={9} fill="#e0e0e0" stroke="#666" strokeWidth={1} />
                      <Line points={[-6, 0, 6, 0]} stroke="black" strokeWidth={1.5} />
                      <Line points={[0, -6, 0, 6]} stroke="black" strokeWidth={1.5} />
                    </Group>
                  </>
                )}
              </Group>
            );
          })}

          {newArrow && (
            <Arrow
              points={[newArrow.start.x, newArrow.start.y, newArrow.end.x, newArrow.end.y]}
              stroke="blue"
              fill="blue"
              strokeWidth={2}
              pointerLength={8}
              pointerWidth={8}
              dash={[4, 4]}
            />
          )}

          {moments.map((m) => {
            const img = m.type === 'moment-cw' ? momentCWImage : momentCCWImage;

            const handleDragEnd = (e) => {
              const { x, y } = e.target.position();
              setMoments((prev) => prev.map((mm) => (mm.id === m.id ? { ...mm, x, y } : mm)));
            };

            if (img) {
              return (
                <KonvaImage
                  key={m.id}
                  image={img}
                  x={m.x}
                  y={m.y}
                  width={60}
                  height={60}
                  offset={{ x: 30, y: 30 }}
                  draggable
                  onClick={() => {
                    if (toolMode === 'eraser') {
                      setMoments((prev) => prev.filter((mm) => mm.id !== m.id));
                    }
                  }}
                  onDragEnd={handleDragEnd}
                />
              );
            }

            return (
              <Group
                key={m.id}
                x={m.x}
                y={m.y}
                draggable
                onClick={() => {
                  if (toolMode === 'eraser') {
                    setMoments((prev) => prev.filter((mm) => mm.id !== m.id));
                  }
                }}
                onDragEnd={handleDragEnd}
              >
                <Circle radius={14} fill="#ccc" stroke="#555" />
                <Line points={[-8, 0, 8, 0]} stroke="#333" />
                <Line points={[0, -8, 0, 8]} stroke="#333" />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Supported thumbnail */}
      {refImage && (
        <div
          onClick={() => setThumbOpen(true)}
          style={{
            position: 'absolute', top: 20, right: 10, width: 180, height: 120, background: '#fff',
            border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80,
            cursor: 'pointer', padding: 6
          }}
        >
          <img
            src={referenceImage}
            alt="supported structure"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'auto' }}
          />
        </div>
      )}

      {/* thumbnail modal */}
      {thumbOpen && (
        <div
          onClick={() => setThumbOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '80%', maxWidth: 900, background: '#fff', borderRadius: 8, padding: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setThumbOpen(false)} style={{ padding: '6px 10px', marginBottom: 8 }}>
                Close
              </button>
            </div>
            <img src={referenceImage} alt="Supported large" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  );
});

export default Canvas;






