import type { Express, Request, Response } from "express";
import { generateOgSvg, type OgParams } from "../../shared/ogImageEngine";

export { generateOgSvg, type OgParams } from "../../shared/ogImageEngine";

export function registerOgRoutes(app: Express) {
  app.get("/api/og", (req: Request, res: Response) => {
    try {
      const svg = generateOgSvg({
        type: typeof req.query.type === "string" ? req.query.type : undefined,
        title: typeof req.query.title === "string" ? req.query.title : undefined,
        subjectCode: typeof req.query.subjectCode === "string" ? req.query.subjectCode : undefined,
        subtitle: typeof req.query.subtitle === "string" ? req.query.subtitle : undefined,
        professorName: typeof req.query.professorName === "string" ? req.query.professorName : undefined,
        version: typeof req.query.version === "string" || typeof req.query.version === "number" ? req.query.version : undefined,
        date: typeof req.query.date === "string" ? req.query.date : undefined,
        present: typeof req.query.present === "string" || typeof req.query.present === "number" ? req.query.present : undefined,
        absent: typeof req.query.absent === "string" || typeof req.query.absent === "number" ? req.query.absent : undefined,
        excused: typeof req.query.excused === "string" || typeof req.query.excused === "number" ? req.query.excused : undefined,
        notSet: typeof req.query.notSet === "string" || typeof req.query.notSet === "number" ? req.query.notSet : undefined,
        totalStudents: typeof req.query.totalStudents === "string" || typeof req.query.totalStudents === "number" ? req.query.totalStudents : undefined,
        tag: typeof req.query.tag === "string" ? req.query.tag : undefined,
        category: typeof req.query.category === "string" ? req.query.category : undefined,
        sourceDomain: typeof req.query.sourceDomain === "string" ? req.query.sourceDomain : undefined,
        format: typeof req.query.format === "string" ? req.query.format : undefined,
        isOfficial: req.query.isOfficial !== "false",
        coverUrl: typeof req.query.coverUrl === "string" ? req.query.coverUrl : undefined,
      });

      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
      res.status(200).send(svg);
    } catch (error) {
      console.error("[OG] Error generating dynamic image:", error);
      res.status(500).send("Error generating preview image");
    }
  });
}
