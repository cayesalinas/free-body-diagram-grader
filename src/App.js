// src/App.js
import React, { useRef, useState, useEffect, useMemo } from 'react';
import PromptView from './components/PromptView';
import Canvas from './components/Canvas';
import ProblemPicker from './components/ProblemPicker';
import problems from './data/problems';
import './App.css';

function App() {
  const IS_DEV = process.env.NODE_ENV === 'development';
  // === Views ===
  const [viewMode, setViewMode] = useState('choose');           // 'choose' | 'start' | 'solve'
  const [solveStage, setSolveStage] = useState('supports');     // 'supports' | 'exploded'

  // === Tools / UI state ===
  const [toolMode, setToolMode] = useState(null);
  const [clearSignal, setClearSignal] = useState(0);
  const [devMode, setDevMode] = useState(IS_DEV);

  const [downloadTrigger, setDownloadTrigger] = useState(0);
  const [feedback, setFeedback] = useState(null);

  // === Problem data ===
  const [supportData, setSupportData] = useState(null);
  const [explodedData, setExplodedData] = useState(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [explodedLoading, setExplodedLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [explodedError, setExplodedError] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState(problems[0].id);
  const canvasRef = useRef(null);

  // === Carry-over elements for exploded stage (NORMALIZED coords for exploded image) ===
  const [lockedArrowsN, setLockedArrowsN] = useState([]);
  const [lockedMomentsN, setLockedMomentsN] = useState([]);
  // zones to ignore during exploded grading (source-side)
  const [mutedZoneIds, setMutedZoneIds] = useState([]);

  // === Problem metadata ===
  const selectedProblem = useMemo(
    () => problems.find((p) => p.id === selectedProblemId) || problems[0],
    [selectedProblemId]
  );
  const problemIndex = useMemo(
    () => Math.max(0, problems.findIndex((p) => p.id === selectedProblemId)),
    [selectedProblemId]
  );
  const problemLabel = useMemo(() => {
    if (selectedProblem?.title) return selectedProblem.title;
    return `Problem ${problemIndex + 1}`;
  }, [selectedProblem, problemIndex]);

  // === Image paths ===
  const mainImage = useMemo(() => {
    if (solveStage === 'exploded' && selectedProblem?.explodedImage) {
      return process.env.PUBLIC_URL + selectedProblem.explodedImage;
    }
    return selectedProblem?.imageNoSupports
      ? process.env.PUBLIC_URL + selectedProblem.imageNoSupports
      : '';
  }, [selectedProblem, solveStage]);

  const referenceImage = useMemo(
    () => (selectedProblem?.image ? process.env.PUBLIC_URL + selectedProblem.image : ''),
    [selectedProblem]
  );

  // === Header text ===
  const headerTitle = useMemo(() => {
    switch (viewMode) {
      case 'choose': return 'Free Body Diagram Checking tool';
      case 'start':
      case 'solve':  return problemLabel;
      default:       return 'Free Body Diagram Checking tool';
    }
  }, [viewMode, problemLabel]);

  const headerSubtitle = useMemo(() => {
    switch (viewMode) {
      case 'choose':
        return 'Select an exercise to begin';
      case 'start':
        return 'Observe the supported structure and click to go to the next page when you are ready to solve it';
      case 'solve':
        return solveStage === 'exploded'
          ? 'Explode members and add internal action–reaction forces at the breakaway joints'
          : 'Replace the supports with the appropriate forces/moments';
      default:
        return 'Select an exercise to begin';
    }
  }, [viewMode, solveStage]);

  // === Page title ===
  useEffect(() => {
    const appName = 'FBD Tool';
    if (viewMode === 'choose') {
      document.title = `${appName} - Menu`;
    } else if (viewMode === 'start') {
      document.title = `${appName} - ${problemLabel} - Preview`;
    } else if (viewMode === 'solve') {
      const stageLabel = solveStage === 'exploded' ? 'Exploded' : 'Canvas';
      document.title = `${appName} - ${problemLabel} - ${stageLabel}`;
    }
  }, [viewMode, problemLabel, solveStage]);

  // === Reset between problems ===
  const resetWorkspace = () => {
    setClearSignal((s) => s + 1);
    setFeedback(null);
    setToolMode(null);
    setSolveStage('supports');
    setExplodedData(null);
    setExplodedError('');
    // in resetWorkspace()
    setLockedArrowsN([]);
    setLockedMomentsN([]);
    setMutedZoneIds([]);

    // in handleExplode() right after setLocked*N([])
    setLockedArrowsN([]);
    setLockedMomentsN([]);
    setMutedZoneIds([]);

    // in handleExplodeDev()
    setLockedArrowsN([]);
    setLockedMomentsN([]);
    setMutedZoneIds([]);
  };

  // === Navigation handlers ===
  const handleChooseProblem = (id) => { setSelectedProblemId(id); resetWorkspace(); };
  const handleGoFromPickerToStart = () => { resetWorkspace(); setViewMode('start'); };
  const handleStart = () => setViewMode('solve');
  const handleReturnToPrompt = () => { setViewMode('start'); setToolMode(null); setFeedback(null); setSolveStage('supports'); };
  const handleReturnToMenu   = () => { setViewMode('choose'); setToolMode(null); setFeedback(null); setSolveStage('supports'); };

  const handleClearAll = () => { setToolMode(null); setClearSignal((s) => s + 1); setFeedback(null); };
  const handleDownloadRegions = () => setDownloadTrigger((d) => d + 1);
  const toggleTool = (val) => setToolMode((t) => (t === val ? null : val));

  // === Submission handler ===
  const handleSubmit = () => {
    if (!canvasRef.current?.checkSubmission) return;
    const result = canvasRef.current.checkSubmission();
    setFeedback(
      typeof result === 'boolean'
        ? result
          ? { overallCorrect: true, jointFeedback: [] }
          : { overallCorrect: false, jointFeedback: [] }
        : result
    );
  };

  // === Regions memo ===
  const initialRegions = useMemo(
    () => (!supportData ? [] : Array.isArray(supportData) ? supportData : supportData.regions || []),
    [supportData]
  );
  const explodedRegions = useMemo(
    () => (!explodedData ? [] : Array.isArray(explodedData) ? explodedData : explodedData.regions || []),
    [explodedData]
  );

  // === Load stage-1 JSON on problem change ===
  useEffect(() => {
    setSupportLoading(true);
    setSupportError('');
    setSupportData(null);
    setExplodedData(null);
    setExplodedError('');

    if (!selectedProblem?.solutionJson) {
      setSupportLoading(false);
      setSupportError('No solutionJson provided for this problem.');
      return;
    }

    // prevent stale SW cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }

    const load = async () => {
      try {
        const cacheKiller = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const url = `${selectedProblem.solutionJson}?cb=${cacheKiller}`;
        const res = await fetch(url, {
          cache: 'reload',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
        const json = await res.json();
        setSupportData(json);
      } catch (err) {
        setSupportError(err?.message || 'Failed to load solution JSON. Check /public/solutions and the console.');
        setSupportData(null);
      } finally {
        setSupportLoading(false);
      }
    };

    load();
  }, [selectedProblem]);

  // === Exploded handlers ===
  const handleExplode = async () => {
    if (!canvasRef.current?.getState) return;

    // snapshot S1 BEFORE switching
    const s1Snapshot = canvasRef.current.getState();        // { arrows, moments, supports }
    const s1ImageRect = canvasRef.current.__getImageDraw?.(); // supports image rect {x,y,w,h}

    // go to exploded + show loader
    setSolveStage('exploded');
    setFeedback(null);
    setToolMode(null);
    setExplodedLoading(true);
    setExplodedError('');
    setLockedArrowsN([]);
    setLockedMomentsN([]);

    const path = selectedProblem?.explodedSolutionJson;
    if (!path || typeof path !== 'string') {
      setExplodedLoading(false);
      setExplodedError('No explodedSolutionJson configured for this problem.');
      return;
    }

    const url = `${process.env.PUBLIC_URL || ''}${path}?cb=${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    let expJson;
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error(`HTTP ${res.status} while loading ${url}`);
      expJson = await res.json();
      setExplodedData(expJson);
    } catch (e) {
      setExplodedError(`Failed to load exploded JSON: ${e.message}`);
      setExplodedLoading(false);
      return;
    }

    try {
      doExplodedMapping(s1Snapshot, expJson, s1ImageRect);
    } catch (e) {
      setExplodedError(`Mapping error: ${e.message}`);
    } finally {
      setExplodedLoading(false);
    }
  };

  const handleExplodeDev = () => {
    if (!selectedProblem?.explodedImage) {
      setExplodedError('No exploded image configured for this problem.');
      return;
    }
    setExplodedData({ regions: [] });
    setLockedArrowsN([]);
    setLockedMomentsN([]);
    setSolveStage('exploded');
    setFeedback(null);
    setExplodedError('');
    setToolMode(null);
  };

  // === Mapping S1 -> S2 (all normalized math) ===
  // === Mapping S1 -> S2 (all normalized math, with strong global de-duplication) ===
  const doExplodedMapping = (stage1State, explodedJson, s1RectPx) => {
    const s1 = stage1State || { arrows: [], moments: [] };

    const s1Zones = (Array.isArray(supportData) ? supportData : supportData?.regions) || [];
    const s2Zones = (Array.isArray(explodedJson) ? explodedJson : explodedJson?.regions) || [];
    if (!s1Zones.length || !s2Zones.length) {
      setExplodedError('Exploded mapping requires both stage-1 and stage-2 regions.');
      return;
    }
    if (
      !s1RectPx ||
      !Number.isFinite(s1RectPx.x) || !Number.isFinite(s1RectPx.y) ||
      !Number.isFinite(s1RectPx.w) || !Number.isFinite(s1RectPx.h) ||
      s1RectPx.w <= 0 || s1RectPx.h <= 0
    ) {
      setExplodedError('Could not read supports image layout for mapping (image size not ready).');
      return;
    }


    // ---------- helpers (normalized space) ----------
    const pointInRectN = (p, r) =>
      p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

    const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    const segIntersectsN = (A, B, C, D) =>
      (ccw(A, C, D) !== ccw(B, C, D)) && (ccw(A, B, C) !== ccw(A, B, D));

    const segmentIntersectsRectN = (P, Q, r) => {
      if (pointInRectN(P, r) || pointInRectN(Q, r)) return true;
      const R1 = { x: r.x, y: r.y };
      const R2 = { x: r.x + r.width, y: r.y };
      const R3 = { x: r.x + r.width, y: r.y + r.height };
      const R4 = { x: r.x, y: r.y + r.height };
      return (
        segIntersectsN(P, Q, R1, R2) ||
        segIntersectsN(P, Q, R2, R3) ||
        segIntersectsN(P, Q, R3, R4) ||
        segIntersectsN(P, Q, R4, R1)
      );
    };

    const toNormS1 = (ptPx) => ({
      x: (ptPx.x - s1RectPx.x) / (s1RectPx.w || 1),
      y: (ptPx.y - s1RectPx.y) / (s1RectPx.h || 1),
    });

    const mapPointN = (ptN, z1, z2) => {
      const rx = (ptN.x - z1.x) / (z1.width || 1e-9);
      const ry = (ptN.y - z1.y) / (z1.height || 1e-9);
      const crx = Math.max(0, Math.min(1, rx));
      const cry = Math.max(0, Math.min(1, ry));
      return { x: z2.x + crx * (z2.width || 0), y: z2.y + cry * (z2.height || 0) };
    };

    const byName = (zones, useMapFrom) => {
      const m = new Map();
      zones.forEach((z) => {
        const key = useMapFrom ? (z?.joint?.mapFrom || z?.joint?.name) : z?.joint?.name;
        if (!key) return;
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(z);
      });
      return m;
    };
    const z1 = byName(s1Zones, false);
    const z2 = byName(s2Zones, true);
    const rectN = (z) => ({ x: z.x, y: z.y, width: z.width, height: z.height });

    const findJointForForce = (a) => {
      const aN = { start: toNormS1(a.start), end: toNormS1(a.end) };
      for (const [name, arr] of z1.entries()) {
        if (arr.some((z) => segmentIntersectsRectN(aN.start, aN.end, rectN(z)))) return name;
      }
      return null;
    };
    const findJointForMoment = (m) => {
      const pN = toNormS1({ x: m.x, y: m.y });
      for (const [name, arr] of z1.entries()) {
        if (arr.some((z) => pointInRectN(pN, rectN(z)))) return name;
      }
      return null;
    };

    // ---------- build all candidates ----------
    // ---------- build all candidates with joint tagging ----------
    const forceCands = []; // {joint,startN,endN,L,mid,ang,id}
    const momentCands = []; // {joint,xN,yN,type,id}

    const midPoint = (s,e) => ({ x: (s.x+e.x)/2, y: (s.y+e.y)/2 });
    const lengthN = (s,e) => Math.hypot(e.x - s.x, e.y - s.y);
    const angleDegN = (s,e) => ((Math.atan2(e.y - s.y, e.x - s.x) * 180) / Math.PI + 360) % 360;

    (s1.arrows || []).forEach((a) => {
      const jointName = findJointForForce(a);
      if (!jointName) return;
      const s1Arr = z1.get(jointName);
      const s2Arr = z2.get(jointName);
      if (!s1Arr?.length || !s2Arr?.length) return;

      const aN = { start: toNormS1(a.start), end: toNormS1(a.end) };
      const s1Rect = s1Arr.find((z) => segmentIntersectsRectN(aN.start, aN.end, rectN(z))) || s1Arr[0];
      const r1 = rectN(s1Rect);

      s2Arr.forEach((z2n) => {
        const r2 = rectN(z2n);
        const s = mapPointN(aN.start, r1, r2);
        const e = mapPointN(aN.end,   r1, r2);
        forceCands.push({
          joint: jointName,
          id: `locked_${a.id}_${z2n.id}`,
          z2Id: z2n.id,                // <— keep the S2 zone id
          startN: s,
          endN: e,
          L: lengthN(s, e),
          mid: midPoint(s, e),
          ang: angleDegN(s, e),
      });
      });
    });

    (s1.moments || []).forEach((m) => {
      const jointName = findJointForMoment(m);
      if (!jointName) return;
      const s1Arr = z1.get(jointName);
      const s2Arr = z2.get(jointName);
      if (!s1Arr?.length || !s2Arr?.length) return;

      const pN = toNormS1({ x: m.x, y: m.y });
      const s1Rect = s1Arr.find((z) => pointInRectN(pN, rectN(z))) || s1Arr[0];
      const r1 = rectN(s1Rect);

      s2Arr.forEach((z2n) => {
        const r2 = rectN(z2n);
        const c2 = mapPointN(pN, r1, r2);
        momentCands.push({
          joint: jointName,
          id: `locked_${m.id}_${z2n.id}`,
          z2Id: z2n.id,      // <-- add this
          xN: c2.x,
          yN: c2.y,
          type: m.type,
        });
      });
    });

    // ---------- PER-JOINT aggressive de-duplication + hard cap ----------
    const POS_EPS = 0.08;  // 8% of image — bigger to swallow near-duplicate zones
    const ANG_EPS = 20;    // 20 degrees
    const angDiff = (a,b) => {
      const d = Math.abs(a-b) % 360;
      return d > 180 ? 360 - d : d;
    };

    // how many reactions did the student place at each joint in S1?
    const s1ForcesByJoint = {};
    (s1.arrows || []).forEach((a) => {
      const j = findJointForForce(a);
      if (!j) return;
      s1ForcesByJoint[j] = (s1ForcesByJoint[j] || 0) + 1;
    });

    // forces: cluster per joint, keep longest first, cap to what S1 had (max 3 safety)
    const acceptedForces = [];
    const forcesByJoint = new Map();
    forceCands.forEach(c => {
      if (!forcesByJoint.has(c.joint)) forcesByJoint.set(c.joint, []);
      forcesByJoint.get(c.joint).push(c);
    });
    for (const [joint, arr] of forcesByJoint.entries()) {
      arr.sort((A,B) => B.L - A.L); // longest first
      const keep = [];
      const cap = Math.min(Math.max(s1ForcesByJoint[joint] || 2, 1), 3);
      arr.forEach((c) => {
        if (keep.length >= cap) return;
        const tooClose = keep.some(k => {
          const d = Math.hypot(k.mid.x - c.mid.x, k.mid.y - c.mid.y);
          const aerr = angDiff(k.ang, c.ang);
          return d < POS_EPS && aerr < ANG_EPS;
        });
        if (!tooClose) keep.push(c);
      });
      acceptedForces.push(...keep);
    }

    // moments: cluster per joint by position only, keep one per spot
    const acceptedMoments = [];
    const momentsByJoint = new Map();
    momentCands.forEach(c => {
      if (!momentsByJoint.has(c.joint)) momentsByJoint.set(c.joint, []);
      momentsByJoint.get(c.joint).push(c);
    });
    for (const [, arr] of momentsByJoint.entries()) {
      const keep = [];
      arr.forEach((c) => {
        const tooClose = keep.some(k => Math.hypot(k.xN - c.xN, k.yN - c.yN) < POS_EPS);
        if (!tooClose) keep.push(c);
      });
      acceptedMoments.push(...keep);
    }


    // commit
    setLockedArrowsN(acceptedForces.map(c => ({ id: c.id, startN: c.startN, endN: c.endN })));
    setLockedMomentsN(acceptedMoments.map(c => ({ id: c.id, xN: c.xN, yN: c.yN, type: c.type })));
    const mutedFromMapping = [
      ...acceptedForces.map(c => c.z2Id),
      ...acceptedMoments.map(c => c.z2Id),
    ].filter(Boolean);
    // Auto-mute zones whose base joint was an external support in stage 1
    const SUPPORT_TYPES = new Set(['fixed', 'pinned', 'roller']);

    const s1SupportBases = new Set(
      s1Zones
        .filter(z => SUPPORT_TYPES.has((z.joint?.type || '').toLowerCase()))
        .map(z => (z.joint?.name || '').split('@')[0])
        .filter(Boolean)
    );

    // Any S2 zone whose base (or mapFrom base) is in that set gets muted
    const autoMutedByBase = s2Zones
      .filter(z => {
        const base = (z.joint?.name || '').split('@')[0];
        const mapFromBase = (z.joint?.mapFrom || '').split('@')[0];
        return s1SupportBases.has(base) || s1SupportBases.has(mapFromBase);
      })
      .map(z => z.id);

    // Final muted set = mapped (forces + moments) ∪ auto-muted supports
    const mutedIds = Array.from(new Set([...mutedFromMapping, ...autoMutedByBase]));
    setMutedZoneIds(mutedIds);
    setExplodedError('');
  };


  // === Render ===
  return (
    <div className="App">
      <div className="header">
        <h1>{headerTitle}</h1>
        <p>{headerSubtitle}</p>
      </div>

      {viewMode === 'choose' ? (
        <ProblemPicker
          problems={problems}
          selectedId={selectedProblemId}
          onSelect={handleChooseProblem}
          onContinue={handleGoFromPickerToStart}
        />
      ) : viewMode === 'start' ? (
        <PromptView
          imagePath={selectedProblem?.image ? process.env.PUBLIC_URL + selectedProblem.image : ''}
          onStart={handleStart}
          onReturnToMenu={handleReturnToMenu}
        />
      ) : (
        <div className="main">
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Canvas
              key={`canvas-${solveStage}-${selectedProblemId}-${solveStage === 'exploded'
                ? JSON.stringify(explodedRegions).length
                : JSON.stringify(initialRegions).length}`}
              ref={canvasRef}
              toolMode={toolMode}
              clearSignal={clearSignal}
              mainImage={mainImage}
              referenceImage={referenceImage}
              devMode={IS_DEV && devMode}
              showCanvasBorder={true}
              downloadTrigger={downloadTrigger}
              initialSupportRegions={solveStage === 'exploded' ? explodedRegions : initialRegions}
              lockedArrowsNorm={solveStage === 'exploded' ? lockedArrowsN : []}
              lockedMomentsNorm={solveStage === 'exploded' ? lockedMomentsN : []}
              muteZoneIds={solveStage === 'exploded' ? mutedZoneIds : []}
              enforceCouples={solveStage === 'exploded'}
            />

            {/* Loading / error overlays */}
            {supportLoading && (
              <div
                className="feedback-banner"
                style={{ background: '#fffbe6', borderColor: '#facc15', color: '#7c5c00', pointerEvents: 'none' }}
              >
                Loading regions…
              </div>
            )}

            {!!supportError && (
              <div className="feedback-banner feedback-banner--bad">{supportError}</div>
            )}

            {explodedLoading && (
              <div
                className="feedback-banner"
                style={{ background: '#fffbe6', borderColor: '#facc15', color: '#7c5c00', pointerEvents: 'none' }}
              >
                Loading exploded regions…
              </div>
            )}

            {!!explodedError && (
              <div
                className="feedback-banner feedback-banner--bad"
                style={{ marginTop: 12, pointerEvents: 'none' }}
              >
                {explodedError}
              </div>
            )}

            {feedback && (
              <div
                className={'feedback-banner ' + (feedback.overallCorrect ? 'feedback-banner--ok' : 'feedback-banner--bad')}
                style={{ pointerEvents: 'none' }}
              >
                {feedback.overallCorrect ? 'Correct' : 'Not quite yet'}
              </div>
            )}

            {/* Only show incorrect joints */}
            {feedback && !feedback.overallCorrect && (
              <div className="feedback-details" role="status" aria-live="polite">
                <h4>Details</h4>
                <ul>
                  {feedback.jointFeedback
                    ?.filter(({ status }) => status !== 'correct')
                    .map(({ joint }) => (
                      <li key={joint.name || 'unnamed'}>
                        <span className="feedback-chip-bad">Joint {joint.name}</span> is not correct
                      </li>
                    ))}
                </ul>

                {Array.isArray(feedback.extrasOutsideAny) && feedback.extrasOutsideAny.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                    extra elements in free body diagram
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="toolbar-title">Select an action</div>

            <button className={toolMode === 'force' ? 'active' : ''} onClick={() => toggleTool('force')}>
              Force
            </button>
            <button className={toolMode === 'moment-cw' ? 'active' : ''} onClick={() => toggleTool('moment-cw')}>
              Clockwise Moment
            </button>
            <button className={toolMode === 'moment-ccw' ? 'active' : ''} onClick={() => toggleTool('moment-ccw')}>
              Counterclockwise Moment
            </button>
            <button className={toolMode === 'eraser' ? 'active' : ''} onClick={() => toggleTool('eraser')}>
              Eraser
            </button>

            {IS_DEV && devMode && (
              <button
                className={toolMode === 'zone-add' ? 'active' : ''}
                onClick={() => toggleTool('zone-add')}
                title="Add grading zones (click-drag on canvas)"
              >
                Add Zones
              </button>
            )}

            <hr />
            <button onClick={() => { setToolMode(null); handleClearAll(); }}>
              Clear All
            </button>

            <hr />
            <button
              onClick={handleSubmit}
              style={{
                backgroundColor: '#007bff',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Submit
            </button>

            {/* Normal explode: only when stage-1 is correct and assets exist */}
            {solveStage === 'supports' &&
              feedback?.overallCorrect &&
              selectedProblem?.explodedImage &&
              selectedProblem?.explodedSolutionJson && (
                <button
                  onClick={handleExplode}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    fontWeight: 'bold',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Explode members →
                </button>
              )}

            {/* Dev access to exploded view without JSON */}
            {solveStage === 'supports' && IS_DEV && devMode && selectedProblem?.explodedImage && (
              <button onClick={handleExplodeDev} title="Open exploded view with empty regions so you can define them">
                Exploded (Dev)
              </button>
            )}

            {solveStage === 'exploded' && (
              <button
                onClick={() => {
                  setSolveStage('supports');
                  setFeedback(null);
                  setToolMode(null);
                }}
              >
                ← Back to supports
              </button>
            )}

            {IS_DEV && (
              <button
                style={{
                  backgroundColor: devMode ? '#555' : '#eee',
                  color: devMode ? '#fff' : '#333',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setDevMode((v) => !v);
                  setToolMode((t) => (t === 'zone-add' ? null : t));
                }}
              >
                {devMode ? 'Exit Dev Mode' : 'Enter Dev Mode'}
              </button>
            )}
            
            {IS_DEV && devMode && (
              <button
                style={{ background: '#007bff', color: '#fff', padding: '8px 12px', borderRadius: 6 }}
                onClick={handleDownloadRegions}
              >
                Download Regions
              </button>
            )}

            <hr />
            <button onClick={() => setViewMode('choose')}>←  Change Problem</button>
            <button onClick={handleReturnToPrompt}>←  Return</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
