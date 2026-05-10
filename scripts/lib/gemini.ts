/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Groq + Pollinations AI Client
 * ──────────────────────────────────────────────────────────────────────────────
 * Wraps the Groq SDK for blazing-fast text generation (LLaMA 3)
 * and Pollinations.ai for completely free, keyless image generation.
 */

import Groq from 'groq-sdk';
import { config } from './config';
import { logger } from './logger';
import { withRetry, sleep } from './retry';

const groq = new Groq({ apiKey: config.ai.groqApiKey });

// ─── Text Generation ────────────────────────────────────────────────────────

export async function generateText<T>(prompt: string, systemPrompt: string): Promise<T> {
  if (process.env.MOCK_MODE === 'true') {
    logger.info('Mock', 'Bypassing Groq — returning mock recipe data.');
    await sleep(1000); // simulate network delay
    return {
      title: "The Ultimate Dry-Aged Ribeye Steak with Garlic Herb Butter",
      slug: "ultimate-dry-aged-ribeye-steak-" + Date.now().toString().slice(-4),
      excerpt: "Master the art of the perfect steakhouse ribeye at home. This comprehensive guide covers dry-brining, the reverse-sear method, and the ultimate garlic herb butter finish.",
      categoryTitle: "Main Course",
      cuisine: "American",
      difficulty: "medium",
      prepTime: 20,
      cookTime: 45,
      servings: 2,
      ingredients: [
        "2 (16oz) prime bone-in ribeye steaks, at least 1.5 inches thick",
        "1 tablespoon coarse kosher salt",
        "1/2 tablespoon freshly cracked black pepper",
        "2 tablespoons high-smoke-point oil (avocado or grapeseed)",
        "3 tablespoons unsalted butter",
        "3 sprigs fresh rosemary",
        "3 sprigs fresh thyme",
        "4 cloves garlic, gently smashed"
      ],
      body: "## Mastering the Steakhouse Ribeye at Home\n\nThere is a certain magic to a perfectly cooked ribeye steak. It's the king of steaks—rich, heavily marbled, and deeply flavorful. But you don't need a 1000-degree broiler to achieve restaurant-quality results at home. Today, we are breaking down the science of the reverse sear.\n\n![Raw marbled ribeye steaks resting on a wooden board](https://images.unsplash.com/photo-1600891964092-4316c288032e?w=1200&q=80)\n\n### The Importance of the Dry Brine\n\nIf you take away only one tip from this article, let it be this: **dry brine your steak.** Salting your steak 24 hours in advance and leaving it uncovered in the fridge allows the salt to penetrate deep into the muscle fibers.\n\n> \"Salting right before cooking only seasons the surface. Salting a day ahead seasons the meat to its core and dries out the exterior for a vastly superior crust.\"\n\nNot only does this season the meat thoroughly, but it also alters the protein structures, allowing the steak to retain more moisture during the cooking process. For more on the science of meat hydration, check out our [CookeTricks Masterclass Collection](/blog).\n\n### The Reverse Sear Method\n\nTraditional methods tell you to sear first, then bake. We are doing the exact opposite. \n\n1. **Low and Slow:** Bake the steaks in a 250°F (120°C) oven until the internal temperature reaches 115°F for medium-rare.\n2. **The Rest:** Let the steaks rest for 10 minutes *before* searing.\n3. **The Sear:** Get a cast-iron skillet ripping hot, add a high-smoke-point oil, and sear for just 60 seconds per side.\n\n![Searing steak in a cast iron pan with butter and herbs](https://images.unsplash.com/photo-1544025162-811c7fae9863?w=1200&q=80)\n\n### Basting with Garlic Herb Butter\n\nDuring the last 30 seconds of your sear, drop the heat and add your butter, smashed garlic, rosemary, and thyme. Tilt the pan and continuously spoon the foaming, aromatic butter over the steaks. This is known as *arroser*, a French culinary technique that builds an incredibly rich crust and infuses the meat with flavor.\n\n### The Final Rest\n\nOnce pulled from the pan, your steak must rest. This allows the muscle fibers to relax and the juices to redistribute. Cutting into a steak immediately will cause all those precious juices to bleed out onto your cutting board.\n\nServe alongside some crispy potatoes and a robust red wine. You've just created a $100 steakhouse experience right in your own kitchen.\n\n![Perfectly cooked medium rare steak sliced on a plate](https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80)",
      seo: {
        metaTitle: "The Ultimate Dry-Aged Ribeye Steak Recipe | CookeTricks",
        metaDescription: "Learn how to reverse-sear a perfect, restaurant-quality dry-aged ribeye steak at home with garlic herb butter."
      },
      imagePrompt: "A beautiful, rustic photo of a perfectly cooked ribeye steak on a wooden board."
    } as unknown as T;
  }

  return withRetry(
    async () => {
      logger.info('Groq', `Calling ${config.ai.textModel} for text generation…`);

      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: config.ai.textModel,
        temperature: 0.85,
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) {
        throw new Error('Groq returned an empty text response.');
      }

      // Safe JSON parsing
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      try {
        return JSON.parse(cleaned) as T;
      } catch {
        logger.error('Groq', 'Failed to parse JSON response. Raw output:', cleaned.slice(0, 500));
        throw new Error('LLM returned invalid JSON. Check the prompt or try again.');
      }
    },
    { label: 'Groq Text Generation' }
  );
}

// ─── Image Generation ───────────────────────────────────────────────────────

export interface GeneratedImage {
  /** Raw image bytes as a Buffer */
  buffer: Buffer;
  /** MIME type of the image */
  mimeType: string;
}

/**
 * Generates a single image using Pollinations.ai REST API.
 * Returns the image bytes as a Buffer ready for upload to Sanity.
 */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  if (process.env.MOCK_MODE === 'true') {
    logger.info('Mock', 'Bypassing Pollinations — returning a tiny transparent placeholder image.');
    await sleep(1000);
    // Append a random byte so the hash is unique and Sanity doesn't try to update the previous one
    const transparentPixel = Buffer.concat([
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'),
      Buffer.from([Math.floor(Math.random() * 256)])
    ]);
    return {
      buffer: transparentPixel,
      mimeType: 'image/png',
    };
  }

  return withRetry(
    async () => {
      logger.info('Pollinations', `Generating image…`);
      logger.debug('Pollinations', 'Prompt:', prompt);

      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=800&nologo=true&seed=${seed}`;

      // Pollinations can be slow to generate; allow up to 60s
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          redirect: 'follow',
        });

        if (!response.ok) {
          throw new Error(`Pollinations API failed: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          throw new Error(`Pollinations returned non-image content-type: ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 5000) {
          throw new Error(`Pollinations returned suspiciously small image (${buffer.length} bytes) — likely a placeholder`);
        }

        logger.success('Pollinations', `Image generated successfully (${(buffer.length / 1024).toFixed(1)} KB)`);

        return {
          buffer,
          mimeType: 'image/jpeg',
        };
      } finally {
        clearTimeout(timeout);
      }
    },
    { label: 'Pollinations Image Generation' }
  );
}
