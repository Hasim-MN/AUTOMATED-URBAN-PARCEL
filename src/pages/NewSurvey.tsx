import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Card, AIDisclaimer } from '@/components/UI';
import {
  Upload, FileText, Map, Mountain, Ruler, MapPin, CheckCircle2,
  Cloud, Building2, Layers3, ArrowRight, X,
} from 'lucide-react';

interface UploadSlot {
  id: string;
  label: string;
  accept: string;
  icon: typeof Upload;
  description: string;
  required: boolean;
}

const UPLOAD_SLOTS: UploadSlot[] = [
  { id: 'aerial', label: 'Aerial Imagery', accept: '.tif,.tiff,.jpg,.png', icon: Cloud, description: 'GeoTIFF, JPG, PNG', required: true },
  { id: 'existing', label: 'Existing Parcel Layer', accept: '.geojson,.shp,.kml', icon: Map, description: 'GeoJSON, Shapefile, KML', required: true },
  { id: 'dsm', label: 'Digital Surface Model (DSM)', accept: '.tif,.tiff', icon: Mountain, description: 'GeoTIFF', required: false },
  { id: 'dtm', label: 'Digital Terrain Model (DTM)', accept: '.tif,.tiff', icon: Layers3, description: 'GeoTIFF', required: false },
  { id: 'gnss', label: 'GNSS/CORS Survey Data', accept: '.csv,.geojson', icon: Ruler, description: 'CSV, GeoJSON', required: false },
];

const STATES = ['Rajasthan', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'Madhya Pradesh', 'Punjab'];

export default function NewSurvey() {
  const { setCurrentPage } = useApp();
  const [formData, setFormData] = useState({
    projectName: '',
    surveyArea: '',
    district: '',
    state: 'Rajasthan',
    surveyDate: new Date().toISOString().split('T')[0],
  });
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFileSelect = (slotId: string, files: FileList | null) => {
    if (!files) return;
    const fileNames = Array.from(files).map(f => f.name);
    setUploadedFiles(prev => ({ ...prev, [slotId]: [...(prev[slotId] || []), ...fileNames] }));
  };

  const removeFile = (slotId: string, fileName: string) => {
    setUploadedFiles(prev => ({ ...prev, [slotId]: (prev[slotId] || []).filter(f => f !== fileName) }));
  };

  const requiredSlotsFilled = UPLOAD_SLOTS.filter(s => s.required).every(s => (uploadedFiles[s.id]?.length ?? 0) > 0);
  const canStart = formData.projectName.trim() !== '' && formData.surveyArea.trim() !== '' && requiredSlotsFilled;

  const handleStart = () => {
    if (canStart) {
      setCurrentPage('ai-processing');
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Create New Survey Project</h2>
        <p className="text-sm text-slate-500 mt-1">Upload aerial imagery and reference data to begin AI-assisted cadastral analysis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project details form */}
        <div className="lg:col-span-1">
          <Card title="Project Details" subtitle="Basic survey information">
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g., Jaipur Urban Parcel Survey"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Survey Area</label>
                <input
                  type="text"
                  value={formData.surveyArea}
                  onChange={(e) => setFormData({ ...formData, surveyArea: e.target.value })}
                  placeholder="e.g., Zone 04, Jaipur"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="Jaipur"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Survey Date</label>
                <input
                  type="date"
                  value={formData.surveyDate}
                  onChange={(e) => setFormData({ ...formData, surveyDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Card>

          {/* Project status timeline */}
          <Card className="mt-4" title="Project Workflow" subtitle="Processing stages">
            <div className="p-5">
              <div className="space-y-3">
                {[
                  { label: 'Created', done: true },
                  { label: 'Data Uploaded', done: requiredSlotsFilled },
                  { label: 'AI Processing', done: false },
                  { label: 'Analysis Complete', done: false },
                  { label: 'Under Review', done: false },
                  { label: 'Field Verification', done: false },
                  { label: 'Completed', done: false },
                ].map((stage, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${stage.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {stage.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-sm ${stage.done ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{stage.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Upload area */}
        <div className="lg:col-span-2">
          <Card title="Data Upload" subtitle="Upload imagery and reference datasets for AI analysis">
            <div className="p-5 space-y-4">
              {UPLOAD_SLOTS.map(slot => {
                const Icon = slot.icon;
                const files = uploadedFiles[slot.id] || [];
                return (
                  <div key={slot.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${files.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            {slot.label}
                            {slot.required && <span className="text-[10px] text-red-500 font-bold">REQUIRED</span>}
                          </div>
                          <div className="text-xs text-slate-500">{slot.description}</div>
                        </div>
                      </div>
                      {files.length > 0 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    </div>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(slot.id); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(null); handleFileSelect(slot.id, e.dataTransfer.files); }}
                      className={`relative border-2 border-dashed rounded-lg p-4 transition-all ${dragOver === slot.id ? 'border-blue-500 bg-blue-50' : files.length > 0 ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50'}`}
                    >
                      {files.length > 0 ? (
                        <div className="space-y-2">
                          {files.map(f => (
                            <div key={f} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-700">{f}</span>
                              </div>
                              <button onClick={() => removeFile(slot.id, f)} className="text-slate-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Add more files
                            <input type="file" accept={slot.accept} multiple className="hidden" onChange={(e) => handleFileSelect(slot.id, e.target.files)} />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer py-3">
                          <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                          <span className="text-sm text-slate-500">Click to upload or drag and drop</span>
                          <span className="text-xs text-slate-400 mt-0.5">{slot.description}</span>
                          <input type="file" accept={slot.accept} multiple className="hidden" onChange={(e) => handleFileSelect(slot.id, e.target.files)} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <AIDisclaimer className="mt-4" />

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-slate-500">
              {requiredSlotsFilled ? (
                <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Required data uploaded</span>
              ) : (
                <span>Upload required files to start AI analysis</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCurrentPage('dashboard')}>Cancel</Button>
              <Button variant="primary" onClick={handleStart} disabled={!canStart}>
                Start AI Analysis <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
