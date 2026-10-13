// Ambient declarations like Vite's client types. Without the extension,
// Go to Definition on an asset import lands here instead of on the file.
declare module '*.svg?react' {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}
declare module '*.svg?url' {
  const src: string;
  export default src;
}
declare module '*.svg?raw' {
  const text: string;
  export default text;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.css';
declare module '*.scss';
