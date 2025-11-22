// /lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiAgent {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private instructions: string;

  constructor(apiKey: string, model = "gemini-2.5-flash", instructions = "") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.instructions = instructions;
  }

  async getResponse(systemMessage: string, userMessage: string) {
    const model = this.genAI.getGenerativeModel({ model: this.model });

    // Start a chat with system message
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      },
    });

    // Send user message and get response
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;

    return response.text();
  }
}
