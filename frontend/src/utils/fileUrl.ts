/**
 * Utility to generate an authenticated download URL for evidence, assessor documents, and compliance reports.
 * Attaches the JWT session token as a query parameter so standard browser link navigation (<a href>)
 * succeeds against requireAuth middleware.
 */
export function getFileDownloadUrl(type: string, filename: string): string {
  if (!filename) return '#';
  const token = localStorage.getItem('panacea_token') || '';
  const cleanFilename = encodeURIComponent(filename);
  const cleanType = encodeURIComponent(type);
  if (token) {
    return `/api/files/${cleanType}/${cleanFilename}?token=${encodeURIComponent(token)}`;
  }
  return `/api/files/${cleanType}/${cleanFilename}`;
}

export function getDownloadQueryUrl(path: string): string {
  if (!path) return '#';
  const token = localStorage.getItem('panacea_token') || '';
  if (token) {
    return `/api/files/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
  }
  return `/api/files/download?path=${encodeURIComponent(path)}`;
}
