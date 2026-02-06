<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Ada's Digital Sovereignty Vision

This application, titled "Ada's Digital Sovereignty Vision," is a high-fidelity, cinematic "Poetical Science" experience. It merges the historical legacy of Ada Lovelace with a modern exploration of National Digital Resilience and tech sovereignty.

As a senior engineer, here is a technical and functional breakdown of the system:

## 1. The Cinematic Stage (AdaStage)

This is the core storytelling module. When a user selects a topic (Biography, Parliamentary Address, or Tech Sovereignty), the app orchestrates a multi-modal generation:

- **Visuals**: It uses gemini-2.5-flash-image to generate a hyper-realistic, 19th-century cinematic portrait of Ada tailored to the specific context.
- **Voice**: It uses gemini-2.5-flash-preview-tts to transform historical-style texts into a spoken performance with a refined "Kore" voice profile.
- **Synchronization**: The UI features a sophisticated paragraph-tracking system. Using character-length markers, the app highlights the specific paragraph being spoken in real-time, creating an immersive, guided reading experience.

## 2. The Consultative AI (AdaChatStage)

Replacing the previous live-voice interaction, this is a specialized text-based chatbot.

- **Model**: Powered by gemini-3-flash-preview for low-latency, intelligent streaming responses.
- **Strict Persona**: It is governed by a rigorous system instruction that forces the AI to remain in character as Ada Lovelace.
- **Domain Restriction**: The bot is engineered to only assist with inquiries regarding the Analytical Engine, mathematics, and the "Tech Sovereignty Report." It is programmed to politely decline unrelated "mundane" queries (like pop culture or general tasks), preserving the intellectual integrity of the experience.

## 3. Technical Architecture

- **State Management**: Built with React, utilizing useRef and useMemo for high-performance audio synchronization and streaming chat history management.
- **Audio Pipeline**: Includes custom PCM decoding logic in utils/audio.ts to handle raw audio bytes returned by the Gemini TTS API, bypassing the limitations of standard browser decodeAudioData for streaming raw PCM.
- **Aesthetics**: A "Victorian-Futurist" UI built with Tailwind CSS, featuring:
  - **Glassmorphism**: Frosted surfaces and thin borders for a modern, high-end feel.
  - **Typography**: A contrast between the high-contrast serif Playfair Display (for history/emotion) and the clean Inter sans-serif (for technical data).
  - **Cinematic Motion**: Subtle scale-animations and "pinging" status indicators that suggest a living "Analytical Engine" running in the background.

## 4. Content Strategy

The app isn't just a tech demo; it's a vehicle for a specific thesis on Digital Sovereignty. It uses the Jacquard loom metaphor to explain modern "hyperscaler" dependencies and the "unswitchable state," effectively using a 19th-century voice to critique 21st-century infrastructure.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up your API key:
   
   To make this application work, you need a single environment variable:
   
   - **Variable Name**: `API_KEY`
   - **Source**: A valid Google Gemini API Key
   - **How to get it**:
     - Visit [Google AI Studio](https://ai.google.dev/)
     - Create a new API key
     - Ensure this key is available in your execution environment as `process.env.API_KEY`
   
   **What this key powers:**
   
   This single key is used by the `@google/genai` SDK to facilitate all three of the app's core AI features:
   - **Image Generation**: Using the `gemini-2.5-flash-image` model to create the cinematic portraits of Ada.
   - **Text-to-Speech (TTS)**: Using the `gemini-2.5-flash-preview-tts` model to generate Ada's historical performances.
   - **Chatbot**: Using the `gemini-3-flash-preview` model to power the specialized consultation interface.
   
   Set the `API_KEY` in [.env.local](.env.local) to your Gemini API key.

3. Run the app:
   ```bash
   npm run dev
   ```
