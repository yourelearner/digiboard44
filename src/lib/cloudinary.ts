const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const createVideoFromFrames = async (frames: string[]): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = 800;
  tempCanvas.height = 600;

  const mediaRecorder = new MediaRecorder(canvas.captureStream(30), {
    mimeType: 'video/webm'
  });
  const chunks: Blob[] = [];

  return new Promise((resolve) => {
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.start();

    let frameIndex = 0;
    const drawFrame = () => {
      if (frameIndex >= frames.length) {
        mediaRecorder.stop();
        return;
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const paths = JSON.parse(frames[frameIndex]);
      paths.forEach((path: any) => {
        ctx.beginPath();
        ctx.strokeStyle = path.strokeColor;
        ctx.lineWidth = path.strokeWidth;

        const points = path.paths[0];
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          points.forEach((point: any, i: number) => {
            if (i > 0) ctx.lineTo(point.x, point.y);
          });
        }
        ctx.stroke();
      });

      frameIndex++;
      setTimeout(drawFrame, 1000 / 30); // 30 FPS
    };

    drawFrame();
  });
};

export const uploadSessionRecording = async (data: string): Promise<string> => {
  const recordingData = JSON.parse(data);
  const videoBlob = await createVideoFromFrames(recordingData.history);

  const formData = new FormData();
  formData.append('file', videoBlob, 'recording.webm');
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'session_recordings');
  formData.append('resource_type', 'video');

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary error details:', errorData);
      throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const getSessionRecordingUrl = (publicId: string): string => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}`;
};