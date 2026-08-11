import type { AppConfig } from "../config.js";

export type QdrantPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

export type SearchHit = {
  score: number;
  payload: Record<string, unknown>;
};

export class QdrantClient {
  constructor(private readonly config: AppConfig) {}

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.qdrantUrl}/readyz`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async ensureCollection(vectorSize: number): Promise<void> {
    const name = this.config.collection;
    const getRes = await fetch(`${this.config.qdrantUrl}/collections/${name}`, {
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    if (getRes.ok) return;
    if (getRes.status !== 404) {
      throw new Error(`Qdrant get collection failed: ${getRes.status}`);
    }

    const createRes = await fetch(`${this.config.qdrantUrl}/collections/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      }),
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      throw new Error(`Qdrant create collection failed: ${createRes.status} ${body.slice(0, 200)}`);
    }
  }

  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;

    const res = await fetch(
      `${this.config.qdrantUrl}/collections/${this.config.collection}/points?wait=true`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Qdrant upsert failed: ${res.status} ${body.slice(0, 200)}`);
    }
  }

  async deleteBySourcePath(projectId: string, sourcePath: string): Promise<void> {
    const res = await fetch(
      `${this.config.qdrantUrl}/collections/${this.config.collection}/points/delete?wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: {
            must: [
              { key: "project_id", match: { value: projectId } },
              { key: "source_path", match: { value: sourcePath } },
            ],
          },
        }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      },
    );

    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => "");
      throw new Error(`Qdrant delete failed: ${res.status} ${body.slice(0, 200)}`);
    }
  }

  /** Return content_hash of an indexed file, if any points exist. */
  async getFileContentHash(projectId: string, sourcePath: string): Promise<string | null> {
    const res = await fetch(
      `${this.config.qdrantUrl}/collections/${this.config.collection}/points/scroll`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: {
            must: [
              { key: "project_id", match: { value: projectId } },
              { key: "source_path", match: { value: sourcePath } },
            ],
          },
          limit: 1,
          with_payload: ["content_hash"],
          with_vector: false,
        }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      },
    );

    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Qdrant scroll failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      result?: { points?: Array<{ payload?: { content_hash?: string } }> };
    };
    const hash = data.result?.points?.[0]?.payload?.content_hash;
    return typeof hash === "string" ? hash : null;
  }

  async search(
    vector: number[],
    projectId: string,
    limit: number,
  ): Promise<SearchHit[]> {
    const res = await fetch(
      `${this.config.qdrantUrl}/collections/${this.config.collection}/points/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
          filter: {
            must: [{ key: "project_id", match: { value: projectId } }],
          },
        }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Qdrant search failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      result?: Array<{ score?: number; payload?: Record<string, unknown> }>;
    };

    return (data.result ?? []).map((row) => ({
      score: typeof row.score === "number" ? row.score : 0,
      payload: row.payload ?? {},
    }));
  }
}
