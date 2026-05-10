import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CookeTricks — Content Studio',
  robots: { index: false }, // Keep the admin panel out of search engines
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 99999,
      }}
    >
      {children}
    </div>
  );
}
