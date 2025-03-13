const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadSessionRecording = async (data: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', new Blob([data], { type: 'application/json' }));
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('api_key', CLOUDINARY_API_KEY);

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload to Cloudinary');
    }

    const result = await response.json();
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload recording');
  }
};

export const getSessionRecordingUrl = (publicId: string): string => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload/${publicId}`;
};