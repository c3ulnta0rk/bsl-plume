import { createAuth } from "@bsl-plume/auth";
import { db } from "./db";

export const auth = createAuth(db);
