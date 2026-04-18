import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ElevenLabsTranscriber from "./ElevenLabsTranscriber.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ElevenLabsTranscriber />
  </StrictMode>
);
