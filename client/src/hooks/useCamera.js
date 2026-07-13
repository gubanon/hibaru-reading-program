import { useEffect, useRef, useState } from "react";

// Real camera preview for the "monitored reading" step (video only — audio
// capture for the transcript is handled separately by SpeechRecognition).
export function useCamera(active) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access isn't available in this browser.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(e => setError(e.name === "NotAllowedError" ? "Camera permission was denied." : "Couldn't access the camera."));
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [active]);

  return { videoRef, error };
}
