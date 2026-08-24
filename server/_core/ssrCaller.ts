import type { Request, Response } from "express";
import { appRouter } from "../routers";
import { createContext } from "./context";

export async function buildSsrPrefetch(req: Request, res: Response) { const context = await createContext({ req, res } as any); const caller = appRouter.createCaller(context); return { publicSubject: (publicId: string) => caller.foundation.publicSubject({ publicId }), publicAttendance: (publicId: string) => caller.foundation.publicAttendance({ publicId }), publicItem: (input: { kind: "announcement" | "resource" | "question"; publicId: string }) => caller.foundation.publicItem(input), publicReport: (publicId: string) => caller.foundation.publicReport({ publicId }) }; }
