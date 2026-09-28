const mimeTypes: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function attachmentMime(name: string) {
  return mimeTypes[name.split('.').pop()?.toLowerCase() ?? ''];
}

/** Validate the entire selection before allocating any object URLs. */
export function validateAttachments(
  files: Pick<File, 'name' | 'type' | 'size'>[],
  existingBytes: number,
) {
  for (const file of files) {
    const mime = attachmentMime(file.name);
    if (!mime || (file.type && file.type !== mime))
      throw new Error(
        `${file.name}: el formato debe ser PDF, JPG, PNG o WebP.`,
      );
    if (!file.size || file.size > 10 * 1024 * 1024)
      throw new Error(
        `${file.name}: el archivo debe pesar entre 1 byte y 10 MB.`,
      );
  }
  if (
    existingBytes + files.reduce((sum, file) => sum + file.size, 0) >
    50 * 1024 * 1024
  )
    throw new Error(
      'La demostración admite hasta 50 MB de archivos. Quita alguno antes de continuar.',
    );
}
