"use client";

import React, { ChangeEvent, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { initManifold, createBoundingDomain, loadSTLToManifold, computeFluidDomain } from '../utils/manifold';
import { checkManifoldness, hasDegenerateFaces, getTriangleCount, exportOpenFOAM, exportBinarySTL } from '../utils/export';
import Viewport from '../components/Viewport';

export default function Home() {
  const { shape, dimensions, setShape, setDimensions, targetObject, setTargetObjectLoaded, setTargetObjectBuffer, patches, setPatch, diagnostics, setDiagnostics, manifoldResult, setManifoldResult, wireframe, setWireframe, selectedFace } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [patchNameInput, setPatchNameInput] = useState('');
  const [patchTypeInput, setPatchTypeInput] = useState('wall');
  const [uploadedFileName, setUploadedFileName] = useState('');

  useEffect(() => {
    // Initialize Manifold WASM on load
    initManifold().catch(console.error);
  }, []);

  useEffect(() => {
    // Recompute domain when parameters or target object change
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let domain: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = null;

    const compute = async () => {
      setIsProcessing(true);
      try {
        await initManifold(); // Ensure it's ready
        domain = createBoundingDomain(shape, dimensions);

        if (targetObject.isLoaded && targetObject.buffer) {
          target = loadSTLToManifold(targetObject.buffer);
        }

        result = computeFluidDomain(domain, target);
        setManifoldResult(result);

        // Update diagnostics
        setDiagnostics({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isWatertight: checkManifoldness(result as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hasDegenerateFaces: hasDegenerateFaces(result as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          totalTriangles: getTriangleCount(result as any),
        });

      } catch (e) {
        console.error("Error computing domain:", e);
      } finally {
        setIsProcessing(false);
      }
    };

    // Add a slight debounce or just run
    const timer = setTimeout(compute, 300);
    return () => {
      clearTimeout(timer);
      if (domain && typeof domain.delete === 'function') domain.delete();
      if (target && typeof target.delete === 'function') target.delete();
      // Notice: we don't delete result here because it's passed to store.
      // We will need to delete old results in the store or component holding it when a new one is set.
    };
  }, [shape, dimensions, targetObject.buffer, targetObject.isLoaded, setDiagnostics, setManifoldResult]);

  const handleDimensionChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newDimensions = [...dimensions] as [number, number, number];
      newDimensions[index] = numValue;
      setDimensions(newDimensions);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        setTargetObjectBuffer(buffer);
        setTargetObjectLoaded(true);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleExportOpenFOAM = () => {
    if (!manifoldResult) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stlString = exportOpenFOAM(manifoldResult as any, patches);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fluid_domain_openfoam.stl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportParaView = () => {
    if (!manifoldResult) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = exportBinarySTL(manifoldResult as any);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fluid_domain_paraview.stl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAssignPatch = () => {
    if (selectedFace !== null && patchNameInput) {
      const id = patchNameInput.toLowerCase().replace(/\s+/g, '-');
      const existingPatch = patches[id];
      const newColor = existingPatch ? existingPatch.color : '#' + Math.floor(Math.random()*16777215).toString(16);

      setPatch(id, {
        name: patchNameInput,
        type: patchTypeInput as "inlet" | "outlet" | "wall" | "symmetry" | "empty",
        faces: existingPatch ? [...new Set([...existingPatch.faces, selectedFace])] : [selectedFace],
        color: newColor
      });

      setPatchNameInput('');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f172a] text-slate-100">
      {/* Background radial gradient mesh */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,41,59,0.8)_0%,rgba(15,23,42,1)_100%)]"></div>

      {/* Left Sidebar - Controls */}
      <div className="relative z-10 w-80 p-6 flex flex-col gap-6 h-full overflow-y-auto border-r border-white/10 bg-white/5 backdrop-blur-md">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
          ManifoldSTL
        </h1>

        {/* Domain Shape Selection */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold border-b border-white/20 pb-2">Bounding Domain</h2>

          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${shape === 'box' ? 'bg-blue-500/50 border border-blue-400/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
              onClick={() => setShape('box')}
            >
              Box
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${shape === 'cylinder' ? 'bg-blue-500/50 border border-blue-400/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
              onClick={() => setShape('cylinder')}
            >
              Cylinder
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {shape === 'box' ? (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Length (X)</label>
                  <input type="number" value={dimensions[0]} onChange={(e) => handleDimensionChange(0, e.target.value)} className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-sm outline-none focus:border-blue-400" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Width (Y)</label>
                  <input type="number" value={dimensions[1]} onChange={(e) => handleDimensionChange(1, e.target.value)} className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-sm outline-none focus:border-blue-400" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Height (Z)</label>
                  <input type="number" value={dimensions[2]} onChange={(e) => handleDimensionChange(2, e.target.value)} className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-sm outline-none focus:border-blue-400" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Radius</label>
                  <input type="number" value={dimensions[0]} onChange={(e) => handleDimensionChange(0, e.target.value)} className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-sm outline-none focus:border-blue-400" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Height</label>
                  <input type="number" value={dimensions[1]} onChange={(e) => handleDimensionChange(1, e.target.value)} className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-sm outline-none focus:border-blue-400" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Target Object Upload */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold border-b border-white/20 pb-2">Target Object</h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="stl-upload" className="block text-sm font-medium text-slate-300">
              Upload STL File
            </label>
            <input
              id="stl-upload"
              type="file"
              accept=".stl"
              aria-describedby="stl-upload-help stl-upload-status"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-500/20 file:text-blue-300
                hover:file:bg-blue-500/30
                cursor-pointer
              "
            />
            <p id="stl-upload-help" className="text-xs text-slate-400">ASCII and binary STL files are supported.</p>
            {uploadedFileName && <p className="text-xs text-slate-300">Selected: {uploadedFileName}</p>}
            <div id="stl-upload-status" role="status" aria-live="polite" className="text-xs mt-1">
              {targetObject.isLoaded && <span className="text-green-400">STL loaded successfully.</span>}
              {isProcessing && <span className="text-yellow-400 animate-pulse">Computing boolean difference...</span>}
            </div>
          </div>
        </div>

      </div>

      {/* Main Center - Viewport */}
      <div className="relative z-10 flex-1 h-full flex flex-col">
        <div className="flex justify-between items-center p-4 bg-black/40 backdrop-blur-sm border-b border-white/10 z-20">
          <div className="flex gap-4 items-center text-sm text-slate-300">
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} className="accent-blue-500" />
               Wireframe
             </label>
             {selectedFace !== null && (
                <span className="text-yellow-400">Selected Face: {selectedFace}</span>
             )}
          </div>
        </div>
        <div className="flex-1 relative">
          <Viewport />
        </div>
      </div>

      {/* Right Sidebar - Diagnostics & Export */}
      <div className="relative z-10 w-80 p-6 flex flex-col gap-6 h-full border-l border-white/10 bg-white/5 backdrop-blur-md">

        <div className="glass-panel p-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold border-b border-white/20 pb-2">Patches</h2>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Patch Name (e.g. inlet)"
              value={patchNameInput}
              onChange={e => setPatchNameInput(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
            />
            <select
              value={patchTypeInput}
              onChange={e => setPatchTypeInput(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
            >
              <option value="wall">Wall</option>
              <option value="inlet">Inlet</option>
              <option value="outlet">Outlet</option>
              <option value="symmetry">Symmetry</option>
            </select>
            <button
              onClick={handleAssignPatch}
              disabled={selectedFace === null || !patchNameInput}
              className="w-full py-1.5 mt-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded text-sm disabled:opacity-50"
            >
              Assign to Selected Face
            </button>
          </div>
          <div className="mt-2 text-xs flex flex-col gap-1 max-h-32 overflow-y-auto">
            {Object.values(patches).map(p => (
              <div key={p.name} className="flex justify-between items-center p-1 bg-black/20 rounded border-l-2" style={{borderColor: p.color}}>
                <span>{p.name} ({p.type})</span>
                <span className="text-slate-400">{p.faces.length} faces</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold border-b border-white/20 pb-2">Diagnostics</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Watertight:</span>
              <span className={diagnostics.isWatertight ? "text-green-400" : "text-red-400"}>
                {diagnostics.isWatertight ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Triangles:</span>
              <span className="text-slate-200">{diagnostics.totalTriangles.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 flex flex-col gap-3 mt-auto">
          <h2 className="text-lg font-semibold border-b border-white/20 pb-2">Export</h2>
          <button
            onClick={handleExportOpenFOAM}
            disabled={!manifoldResult || isProcessing}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-md font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export OpenFOAM (ASCII)
          </button>
          <button
            onClick={handleExportParaView}
            disabled={!manifoldResult || isProcessing}
            className="w-full py-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export ParaView (Binary)
          </button>
        </div>

      </div>

    </div>
  );
}
