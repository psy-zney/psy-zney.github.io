export type IntroMedia = { url: string | null; poster: string | null };
export function originalIntroMedia(input: unknown): IntroMedia {
  if (!input || typeof input !== 'object') return {url:null,poster:null};
  const data=input as Record<string,unknown>;
  const allowed=(value:unknown) => typeof value==='string' && (/^https:\/\//.test(value)||value.startsWith('./video/')) && !value.includes('tunnel-reference') ? value : null;
  return {url:allowed(data.url),poster:allowed(data.poster)};
}
