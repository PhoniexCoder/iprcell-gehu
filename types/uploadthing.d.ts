declare module "@uploadthing/react" {
  // Minimal type shim to satisfy TS without strict types
  // The actual package provides full types; this prevents IDE errors if resolution lags.
  export function generateReactHelpers<T>(): {
    uploadFiles: (endpoint: keyof T, opts: { files: File[] }) => Promise<Array<{ url: string }>>
  }
}
