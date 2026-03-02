declare global {
  declare const __VERSION__: string;
  interface Window {
    Neutralino: Object | undefined;
    NL_ARGS: string[] | undefined;
  }
}
export {};
