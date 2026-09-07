function sanitize(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi, ' $1="#"');
}

const RESPONSIVE_IMAGE_ATTRIBUTES = [
  'width',
  'height',
  'srcset',
  'sizes',
] as const;

function warnAboutInlineImages(html: string): void {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const issues = imageTags.flatMap((tag, index) => {
    const missingAttributes = RESPONSIVE_IMAGE_ATTRIBUTES.filter(
      (attribute) =>
        !new RegExp(`\\s${attribute}\\s*=`, 'i').test(tag),
    );

    return missingAttributes.length > 0
      ? [{ imagePosition: index + 1, missingAttributes }]
      : [];
  });

  if (issues.length > 0) {
    console.warn('[safe-html:inline-image-attributes-missing]', {
      imageCount: imageTags.length,
      affectedImageCount: issues.length,
      issues,
    });
  }
}

export function SafeHtml({ html, className = '' }: { html: string; className?: string }) {
  const sanitizedHtml = sanitize(html);
  warnAboutInlineImages(sanitizedHtml);

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
