const SAFETY_SUFFIX = 'no real faces, no logos, no trademarks, no real people, no storefronts with identifiable signage, no copyrighted characters';

export interface ImageGenerationService {
  generate(prompt: string, options?: { width?: number; height?: number }): Promise<string>;
}

class PollinationsService implements ImageGenerationService {
  async generate(prompt: string, options?: { width?: number; height?: number }): Promise<string> {
    const w = options?.width ?? 1080;
    const h = options?.height ?? 1080;
    const safePrompt = `${prompt}, ${SAFETY_SUFFIX}`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=${w}&height=${h}&nologo=true&enhance=true`;

    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const mimeType = res.headers.get('content-type') ?? 'image/png';
    return `data:${mimeType};base64,${base64}`;
  }
}

export const imageGenerationService: ImageGenerationService = new PollinationsService();

export function buildImagePrompt(userPrompt: string, imageStyle: string): string {
  const style = imageStyle
    ? `Style: ${imageStyle}.`
    : 'Style: clean, professional, high quality food/product photography.';
  return `${userPrompt}. ${style} ${SAFETY_SUFFIX}`;
}
