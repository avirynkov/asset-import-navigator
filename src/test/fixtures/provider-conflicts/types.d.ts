// Legitimate declarations: navigation to these must stay with TypeScript (NINT-02/03).
declare module 'fake-pkg' {
  export function pkgFn(): number;
}

interface LegitGlobal {
  x: number;
}

declare const legitGlobal: LegitGlobal;

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
