import type { IngestInput } from "../observation.types.js";

export interface BaseAdapter {
  normalize(raw: unknown): Partial<IngestInput>;
}
