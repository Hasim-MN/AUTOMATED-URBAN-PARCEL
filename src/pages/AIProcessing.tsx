import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Card, AIDisclaimer } from '@/components/UI';
import {
  CheckCircle2, Loader2, Circle, ArrowRight, Cpu, Scan,
  Building2, GitCompare, GitBranch, BarChart3, Sparkles,
} from 'lucide-react';

const STAGES = [
  { id: 0, label: 'Loading aerial imagery', icon: Scan, detail: 'Reading GeoTIFF tiles and orthorectified imagery' },
  { id: 1, label: 'Image preprocessing', icon: Cpu, detail: 'Normalization, orthorectification, color balancing' },
  { id: 2, label: 'Parcel boundary segmentation', icon: Sparkles, detail: 'Deep learning model detecting visible boundaries' },
  { id: 3, label: 'Building detection', icon: Building2, detail: 'Extracting building footprints from imagery' },
  { id: 4, label: 'Feature extraction', icon: Scan, detail: 'Roads, fences, walls, natural boundaries' },
  { id: 5, label: 'Preliminary parcel generation', icon: Sparkles, detail: 'Vectorizing detected boundaries into polygons' },
  { id: 6, label: 'Existing GIS comparison', icon: GitCompare, detail: 'Comparing AI parcels with cadastral records' },
  { id: 7, label: 'Topology validation', icon: GitBranch, detail: 'Checking overlaps, gaps, self-intersections' },
  { id: 8, label: 'Confidence scoring', icon: BarChart3, detail: 'Assigning per-parcel confidence scores' },
  { id: 9, label: 'Analysis completed', icon: CheckCircle2, detail: 'Preliminary parcel map ready for review' },
];

export default function AIProcessing() {
  const { setCurrentPage } = useApp();
  const [currentStage, setCurrentStage] = useState(0);
  const [stageStates, setStageStates] = useState<('pending' | 'processing' | 'completed')[]>(STAGES.map(() => 'pending'));
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let stage = 0;
    let stageProgress = 0;

    intervalRef.current = setInterval(() => {
      if (stage >= STAGES.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setComplete(true);
        return;
      }

      stageProgress += Math.random() * 15 + 5;

      setStageStates(prev => {
        const next = [...prev];
        next[stage] = 'processing';
        if (stageProgress >= 100) {
          next[stage] = 'completed';
          stage++;
          stageProgress = 0;
        }
        return next;
      });

      const overallProgress = Math.min(100, Math.round(((stage + stageProgress / 100) / STAGES.length) * 100));
      setProgress(overallProgress);

      if (stage >= STAGES.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setComplete(true);
        setCurrentStage(STAGES.length);
      } else {
        setCurrentStage(stage);
      }
    }, 400);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">AI Cadastral Analysis</h2>
        <p className="text-sm text-slate-500 mt-1">
          {complete ? 'Analysis complete — preliminary parcels ready for review.' : 'Processing aerial imagery through the AI analysis pipeline...'}
        </p>
      </div>

      {/* Progress bar */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${complete ? 'bg-green-100' : 'bg-blue-100'}`}>
                {complete ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {complete ? 'AI Analysis Complete' : `Stage ${currentStage + 1} of ${STAGES.length}: ${STAGES[currentStage]?.label || ''}`}
                </div>
                <div className="text-xs text-slate-500">{STAGES[currentStage]?.detail || 'All stages completed'}</div>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{progress}%</div>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Card>

      {/* Stages */}
      <Card title="Processing Pipeline" subtitle="AI analysis workflow stages">
        <div className="p-5">
          <div className="space-y-2">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const state = stageStates[i];
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    state === 'completed' ? 'bg-green-50' :
                    state === 'processing' ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    state === 'completed' ? 'bg-green-500 text-white' :
                    state === 'processing' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {state === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                     state === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                     <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${state === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                      {stage.label}
                    </div>
                    <div className={`text-xs ${state === 'pending' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {stage.detail}
                    </div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide">
                    {state === 'completed' && <span className="text-green-600">Done</span>}
                    {state === 'processing' && <span className="text-blue-600">Processing</span>}
                    {state === 'pending' && <span className="text-slate-400">Pending</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Completion summary */}
      {complete && (
        <Card className="border-green-200 bg-green-50/50">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-slate-800">AI Analysis Complete</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Preliminary Parcels</div>
                <div className="text-xl font-bold text-blue-600">1,284</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-500">High Confidence</div>
                <div className="text-xl font-bold text-green-600">1,031</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Require Review</div>
                <div className="text-xl font-bold text-amber-600">198</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Field Verification</div>
                <div className="text-xl font-bold text-red-600">55</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Topology Conflicts</div>
                <div className="text-xl font-bold text-slate-700">43</div>
              </div>
            </div>
            <Button variant="primary" size="lg" onClick={() => setCurrentPage('cadastral-map')}>
              Open Cadastral Map <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      <AIDisclaimer />

      {/* Architecture note */}
      <Card title="AI Pipeline Architecture" subtitle="How the analysis works">
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['Aerial Imagery', 'Preprocessing', 'DL Segmentation', 'Feature Extraction', 'Boundary Inference', 'Vectorization', 'Topology Optimization', 'GIS Comparison', 'GNSS Validation', 'Confidence Scoring', 'Surveyor Review', 'Final GIS Output'].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <span className="px-2.5 py-1.5 bg-slate-100 rounded-lg font-medium text-slate-700">{step}</span>
                {i < arr.length - 1 && <span className="text-slate-400">→</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            This prototype simulates the AI backend. The UI is architected so a real FastAPI + PyTorch model can replace the mock service layer.
          </p>
        </div>
      </Card>
    </div>
  );
}
