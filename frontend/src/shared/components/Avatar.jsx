import { useState } from 'react';
import { urlAvatar } from '../../utils/avatar';

/**
 * La foto de perfil, pedida del tamaño en que se va a ver.
 *
 * Se mostraba la imagen original —a veces de varios miles de píxeles— dentro
 * de un círculo de 32, y en pantallas densas se veía pixelada.
 *
 * Si la versión recortada no carga —una cuenta de Cloudinary con
 * transformaciones restringidas, por ejemplo— se cae a la original en vez de
 * quedarse sin foto: grande y borrosa es mejor que un hueco.
 */
export default function Avatar({ url, lado, alt = '', style, className }) {
  const [falloRecorte, setFalloRecorte] = useState(false);
  const original = (url || '').trim();
  if (!original) return null;

  return (
    <img
      src={falloRecorte ? original : urlAvatar(original, lado)}
      onError={() => setFalloRecorte(true)}
      alt={alt}
      width={lado}
      height={lado}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}
