declare module '*.svg?react' {
  const Component: unknown;
  export default Component;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
