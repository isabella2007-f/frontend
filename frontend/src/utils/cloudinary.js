import { CLOUDINARY } from "../config/api";

export async function subirImagenCloudinary(archivo) {
  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", CLOUDINARY.uploadPreset);

  const res = await fetch(CLOUDINARY.uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Error Cloudinary (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url; // ← esta URL es la que le mandas a la API
}