export interface GBPAccount {
  name: string;
  accountName: string;
  type: string;
}

export interface GBPLocation {
  name: string;
  title: string;
  websiteUri?: string;
}

export interface GBPPost {
  summary: string;
  mediaItems: { googleUrl: string }[];
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description ?? data.error}`);
  return data.access_token;
}

export async function getAccounts(token: string): Promise<GBPAccount[]> {
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Failed to fetch accounts');
  return data.accounts ?? [];
}

export async function getLocations(token: string, accountName: string, storeName?: string): Promise<GBPLocation[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,websiteUri`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Failed to fetch locations');
  const locations: GBPLocation[] = data.locations ?? [];
  if (storeName && locations.length > 1) {
    const normalized = storeName.toLowerCase();
    const match = locations.find(l => l.title?.toLowerCase().includes(normalized));
    if (match) return [match];
  }
  return locations;
}

export async function getLocalPosts(token: string, locationName: string, pageSize = 20): Promise<GBPPost[]> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts?pageSize=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Failed to fetch posts');
  return (data.localPosts ?? []).map((p: any) => ({
    summary: p.summary ?? '',
    mediaItems: (p.media ?? []).map((m: any) => ({ googleUrl: m.googleUrl ?? '' })).filter((m: any) => m.googleUrl),
  }));
}
