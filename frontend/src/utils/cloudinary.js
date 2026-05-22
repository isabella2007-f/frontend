import { CLOUDINARY } from "../config/api";

export async function subirImagenCloudinary(archivo) {
  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", CLOUDINARY.uploadPreset);

  const res = await fetch(CLOUDINARY.uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error('Error al subir imagen a Cloudinary');

  const data = await res.json();
  return data.secure_url; // ← esta URL es la que le mandas a la API
}