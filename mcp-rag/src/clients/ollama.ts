import type { AppConfig } from "../config.js";

export class OllamaClient {
  constructor(private readonly config: AppConfig) {}

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
    if (!res.ok) throw new Error(`Ollama /api/tags failed: ${res.status}`);
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    return (data.models ?? []).map((m) => m.name ?? "").filter(Boolean);
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.config.ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        prompt: text,
      }),
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama embed failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as { embedding?: number[] };
    if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
      throw new Error("Ollama returned empty embedding");
    }
    return data.embedding;
  }
}
