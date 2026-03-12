import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerPatient } from '../api/patients';
import { ageFromDob } from '../types/patient';

const initialForm = {
  name: '',
  dateOfBirth: '',
  age: 0,
  address: '',
  town: '',
  nationality: 'Ghanaian',
  nationalId: '',
  image: '',
};

export function RegisterPatientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const age = form.dateOfBirth ? ageFromDob(form.dateOfBirth) : 0;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Attach stream to video once the element is mounted (after cameraActive becomes true)
  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch((e) => {
      setCameraError(e instanceof Error ? e.message : 'Video play failed');
    });
    return () => {
      video.srcObject = null;
    };
  }, [cameraActive]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Could not access camera.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVideoReady(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setForm((f) => ({ ...f, image: dataUrl }));
    stopCamera();
  }, [stopCamera]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!form.name.trim()) {
      setSubmitError('Name is required.');
      return;
    }
    if (!form.dateOfBirth) {
      setSubmitError('Date of Birth is required.');
      return;
    }
    if (!form.address.trim()) {
      setSubmitError('Address is required.');
      return;
    }
    if (!form.town.trim()) {
      setSubmitError('Town is required.');
      return;
    }
    if (!form.nationality.trim()) {
      setSubmitError('Nationality is required.');
      return;
    }
    if (!form.nationalId.trim()) {
      setSubmitError('National ID is required.');
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await registerPatient({
        name: form.name.trim(),
        date_of_birth: form.dateOfBirth,
        age,
        address: form.address.trim(),
        town: form.town.trim(),
        nationality: form.nationality.trim(),
        national_id: form.nationalId.trim(),
        image: form.image || undefined,
      });
      navigate(`/patient/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
  const labelClass = "mb-1 block text-sm font-medium text-slate-600";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/"
        className="inline-block text-sm font-medium text-teal-600 hover:underline"
      >
        ← Back to search
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Register New Patient</h1>
        <p className="mt-1 text-slate-600">Required fields must be filled. Other medical fields can be updated later.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {submitError && (
          <p className="rounded-lg bg-red-100 py-2 text-center text-sm text-red-800">{submitError}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Date of Birth *</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              max={new Date().toISOString().slice(0, 10)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Age (auto from DOB)</label>
            <input type="text" value={age} readOnly className={inputClass + " bg-slate-100"} />
          </div>
          <div>
            <label className={labelClass}>Town *</label>
            <input
              type="text"
              value={form.town}
              onChange={(e) => setForm((f) => ({ ...f, town: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address / Digital Address *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Nationality *</label>
            <input
              type="text"
              value={form.nationality}
              onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>National ID *</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Photo (optional) — live capture</label>
            {cameraError && <p className="mb-2 text-sm text-red-600">{cameraError}</p>}
            {!form.image && !cameraActive && (
              <button
                type="button"
                onClick={startCamera}
                className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Start camera
              </button>
            )}
            {cameraActive && (
              <div className="space-y-2">
                <div className="relative aspect-video max-w-sm overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    onLoadedData={() => setVideoReady(true)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!videoReady}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {videoReady ? 'Capture photo' : 'Starting camera…'}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {form.image && !cameraActive && (
              <div className="flex items-start gap-3">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                  <img src={form.image} alt="Captured" className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image: '' }))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Retake photo
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register Patient'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
