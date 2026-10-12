/// <reference types="vite/client" />
import 'react';
declare global {
  const __STATIC_PAGES__: boolean;
}
// Theme and animation variables are set through React's style prop.
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
