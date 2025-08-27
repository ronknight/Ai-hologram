# AI Voice Chat Hologram

An AI-powered voice chat application featuring a realistic hologram interface, designed to work with a local Ollama server for fast, streaming responses. Includes an admin panel for configuring the AI model and server settings, and a playground for testing advanced prompting strategies.

## Features

- **Voice-First Interaction**: Control the assistant using your voice with a customizable trigger word.
- **Real-time Streaming**: Get instant, streaming responses from the AI, both in text and speech (TTS).
- **Futuristic UI**: A dynamic hologram interface that visualizes the AI's state (idle, listening, speaking).
- **Text Input**: Full support for typing messages as an alternative to voice commands.
- **Local First**: Connects to your own local Ollama server, ensuring privacy and control over your data.
- **Highly Configurable**: An admin panel allows you to easily change the Ollama server URL, select different models, adjust the AI's personality with a system prompt, and more.
- **Ollama Playground**: An integrated testing environment to experiment with different prompting strategies like structured JSON generation, grounded Q&A, and more.
- **Responsive Design**: Works seamlessly across different screen sizes.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Speech**: Web Speech API (SpeechRecognition for STT, SpeechSynthesis for TTS)
- **AI Backend**: [Ollama](https://ollama.com/)

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

1.  **Node.js**: Ensure you have a recent version of Node.js installed.
2.  **Ollama**: You must have Ollama installed and running.
    - Download from [ollama.com](https://ollama.com/).
    - Pull a model to use with the application, for example:
      ```bash
      ollama pull gemma2:2b
      ```
    - Ensure the Ollama server is running. By default, it runs at `http://localhost:11434`.

### Installation & Running

This project is set up to run in a web-based development environment.

1.  **Configure the AI**:
    - Once the app loads, click the settings icon in the top-right corner.
    - Ensure the "Ollama Server URL" is correct for your setup (the default is `http://localhost:11434`).
    - Click "Test & Refresh" to load your available Ollama models.
    - Select a model from the dropdown.

2.  **Start Chatting**:
    - Navigate back to the main "AI Voice Assistant" view.
    - You're ready to interact!

## How to Use

1.  **Grant Permissions**: When you first open the application, your browser will ask for microphone permission. Please allow it to enable voice features.
2.  **Activate**: Say the trigger word (default is "**hey assistant**") to make the AI start listening. The hologram will change to indicate it's active.
3.  **Speak**: Ask your question or give your command.
4.  **Interact**: The AI will process your request and respond with both voice and text.
5.  **Type**: You can also use the text input at the bottom of the screen to chat with the assistant.

## Ollama Service Playground

The application includes a playground to explore and test advanced prompting strategies with your local Ollama models. This is a great way to understand how to get structured, reliable, and constrained outputs from the AI.

Navigate to the "Playground" view from the header to access it.

The playground demonstrates four key strategies:

-   **Structured JSON Output**: Force the model to return a clean, syntactically correct JSON object by providing a prompt and a schema description.
-   **Constrained Text**: Generate a short, specific text output (like a summary or a title) by giving the model a single, restrictive task.
-   **Rich Content (Markdown)**: Generate formatted text by setting a persona and structure for the model to follow.
-   **Grounded Q&A**: Force the model to answer a question based *only* on a specific context you provide, preventing it from using its general knowledge.

---

This project provides a comprehensive blueprint for building sophisticated voice-driven AI applications on top of local language models.
