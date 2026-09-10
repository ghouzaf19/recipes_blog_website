import { cookies, draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { PREVIEW_SESSION_COOKIE } from '@/lib/cooketricks-security';
import { SITE_URL } from '@/lib/site';

export async function GET() {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_SESSION_COOKIE);
  redirect(SITE_URL);
}
