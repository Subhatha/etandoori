export const dynamic = 'force-static';
export function GET() {
  const base = process.env.NODE_ENV === 'production' ? '/etandoori' : '';
  return Response.json({ name: 'eTandoori Restaurant', short_name: 'eTandoori', id: `${base}/admin/`, start_url: `${base}/admin/orders/`, scope: `${base}/admin/`, display: 'standalone', background_color: '#100d0a', theme_color: '#19130f', icons: [{ src: `${base}/logo.jpeg`, type: 'image/jpeg', sizes: 'any' }] }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
