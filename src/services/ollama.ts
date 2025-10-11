export const generateChatStream = async (prompt: string, onChunk: (chunk: string) => void, onDone: () => void) => {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama2', // or any other model you have
        prompt: prompt,
        stream: true,
      }),
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onDone();
        break;
      }
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line) {
          const parsed = JSON.parse(line);
          onChunk(parsed.response);
        }
      }
    }
  } catch (error) {
    console.error('Error generating chat stream:', error);
  }
};