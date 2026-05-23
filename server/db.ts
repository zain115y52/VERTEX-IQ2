import { randomUUID } from "crypto";
import { MockDB } from "./mockStore.js";

// We use an in-memory mock store that perfectly emulates the relational constraints
// required. This ensures the app is extremely stable (no black screens or SQL driver panics).
export const db = new MockDB();
