const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const createVideoFromFrames = async (frames: string[]): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve) => {
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

      // Clear canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        const paths = JSON.parse(frames[frameIndex]);
        if (Array.isArray(paths)) {
          paths.forEach((path) => {
            if (path.paths && path.paths[0]) {
              ctx.beginPath();
              ctx.strokeStyle = path.strokeColor || 'black';
              ctx.lineWidth = path.strokeWidth || 4;

              const points = path.paths[0];
              if (points.length > 0) {
                ctx.moveTo(points[0].x, points[0].y);
                points.forEach((point: any, i: number) => {
                  if (i > 0) ctx.lineTo(point.x, point.y);
                });
              }
              ctx.stroke();
            }
          });
        }
      } catch (error) {
        console.error('Error drawing frame:', error);
      }

      frameIndex++;
      requestAnimationFrame(drawFrame);
    };

    // Start animation loop
    drawFrame();
  });
};

export const uploadSessionRecording = async (data: string): Promise<string> => {
  try {
    const recordingData = JSON.parse(data);

    if (!Array.isArray(recordingData.history) || recordingData.history.length === 0) {
      throw new Error('No recording data available');
    }

    const videoBlob = await createVideoFromFrames(recordingData.history);

    if (videoBlob.size === 0) {
      throw new Error('Generated video is empty');
    }

    const formData = new FormData();
    formData.append('file', videoBlob, 'recording.webm');
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('resource_type', 'video');

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
    console.error('Error in uploadSessionRecording:', error);
    throw error;
  }
};

export const getSessionRecordingUrl = (publicId: string): string => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}`;
};