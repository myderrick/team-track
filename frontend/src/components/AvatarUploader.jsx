//AvatarUploader.jsx
// src/components/AvatarUploader.jsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '@/lib/supabaseClient';
import { X, Upload, Loader2 } from 'lucide-react';

function getCroppedBlob(image, cropPixels) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  ctx.drawImage(
    image,
    cropPixels.x * scaleX,
    cropPixels.y * scaleY,
    cropPixels.width * scaleX,
    cropPixels.height * scaleY,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}

export default function AvatarUploader({ open, onClose, onUploaded }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedPixels(areaPixels);
  }, []);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result);
    reader.readAsDataURL(f);
  };

  const canSave = useMemo(() => imgSrc && croppedPixels, [imgSrc, croppedPixels]);

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      // Get current user
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) throw new Error('Not signed in');

      // Make cropped blob
      const img = new Image();
      img.src = imgSrc;
      await new Promise(res => img.onload = res);
      const blob = await getCroppedBlob(img, croppedPixels);

      const path = `${uid}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
      if (upErr) throw upErr;

      // Public URL (because bucket is public)
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub?.publicUrl;

      // Store in auth user metadata
      const { error: updErr } = await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (updErr) throw updErr;

      onUploaded?.(url);
      onClose?.();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Update avatar</div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {!imgSrc ? (
            <div className="border-2 border-dashed rounded-xl p-6 text-center">
              <input ref={fileRef} onChange={pickFile} type="file" accept="image/*" className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2">
                <Upload className="w-4 h-4" /> Choose image
              </button>
              <p className="text-xs text-gray-500 mt-2">JPG or PNG, up to ~2MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative h-64 bg-gray-100 rounded-xl overflow-hidden">
                <Cropper
                  image={imgSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e)=>setZoom(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between">
                <button onClick={()=>setImgSrc(null)} className="px-3 py-2 rounded-lg border">Choose different image</button>
                <button
                  onClick={save}
                  disabled={!canSave || busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {busy ? 'Uploading…' : 'Save avatar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
