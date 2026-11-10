import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/json/monaco.contribution";

window.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === "json") {
      return new Worker(new URL("../../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js", import.meta.url), { type: "module" });
    }
    return new Worker(new URL("../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" });
  },
};

loader.config({ monaco });

export default function JsonEditor({ value, onChange }: { value: string; onChange(value: string | undefined): void }) {
  return <Editor
    height="430px"
    language="json"
    theme="vs-dark"
    value={value}
    onChange={onChange}
    options={{
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      padding: { top: 12 },
      automaticLayout: true,
    }}
  />;
}
