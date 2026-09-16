import { RenderMode, ServerRoute } from '@angular/ssr';

// Supabase keeps the session in the browser (localStorage), so auth-dependent pages render on the client.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
