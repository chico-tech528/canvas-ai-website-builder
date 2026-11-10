/// <reference types="vite/client" />

declare global {
  interface Window {
    MonacoEnvironment: {
      getWorker(workerId: string, label: string): Worker;
    };
  }
}

declare module "monaco-editor/esm/vs/editor/editor.api" {
  export * from "monaco-editor";
}

declare module "monaco-editor/esm/vs/language/json/monaco.contribution";
