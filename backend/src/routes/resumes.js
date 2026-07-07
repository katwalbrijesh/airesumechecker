const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadPdf } = require("../middleware/upload");

const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const User = require("../models/User");

const { analyzeLimiter } = require("../middleware/rateLimit");
const Analysis = require("../models/Analysis");
const { analyzeResume } = require("../services/geminiService");

const { diffText, summarize } = require("../services/diffService");


const { extractText } = require("../services/pdfService");
const { 
  parseResume: parseStructured,
} = require("../services/structuredParser");

const router = express.Router();
router.use(requireAuth);

const objectIdSchema = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: "Invalid id" });

const idParam = z.object({ id: objectIdSchema });

async function loadOwnedResume(req) {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!resume) throw ApiError.notFound("Resume not found");
  return resume;
}

async function loadVersion(resumeId, versionId) {
  const version = await ResumeVersion.findOne({ _id: versionId, resumeId });
  if (!version) throw ApiError.notFound("Version not found");
  return version;
}

router.post(
  "/",
  uploadPdf("file"),
  asyncHandler(async (req, res) => {
    const { text, meta } = await extractText(req.file.buffer);
    const parsedSections = await parseStructured(text);

    const title =
      (req.body.title || "").trim() ||
      req.file.originalname.replace(/\.pdf$/i, "") ||
      "Untitled Resume";

    const resume = await Resume.create({
      userId: req.user._id,
      title,
      latestVersionNumber: 1,
    });

    const version = await ResumeVersion.create({
      resumeId: resume._id,
      versionNumber: 1,
      label: "V1",
      rawText: text,
      parsedSections,
      sourceType: "upload",
      parentVersionId: null,
    });

    resume.currentVersionId = version._id;
    await resume.save();

    res.status(201).json({ resume, version, meta });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const resumes = await Resume.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ resumes });
  })
);

router.get(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);
    const versions = await ResumeVersion.find({ resumeId: resume._id })
      .sort({ versionNumber: 1 })
      .select("-rawText")
      .lean();
    res.json({ resume, versions });
  })
);

router.get(
  "/:id/versions/:versionId",
  validate(
    z.object({ id: objectIdSchema, versionId: objectIdSchema }),
    "params"
  ),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);
    const version = await loadVersion(resume._id, req.params.versionId);
    res.json({ version });
  })
);

router.delete(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);
    await ResumeVersion.deleteMany({ resumeId: resume._id });
    await Analysis.deleteMany({ resumeId: resume._id });
    await resume.deleteOne();
    res.json({ ok: true });
  })
);

const analyzeBody = z.object({
  versionId: objectIdSchema.optional(),
  targetRole: z.string().trim().max(120).optional(),
});

router.post(
  "/:id/analyze",
  analyzeLimiter,
  validate(idParam, "params"),
  validate(analyzeBody),
  asyncHandler(async (req, res) => {
    console.log("!!!!! ANALYZE ROUTE HIT !!!!!");
    const resume = await loadOwnedResume(req);

    // ---- Free plan usage limit ----
    const FREE_LIMIT = 2;
    const user = req.user;

    const now = new Date();
    const cycleStart = user.analysisCycleStart || now;
    const daysSinceCycleStart = (now - cycleStart) / (1000 * 60 * 60 * 24);

    // Reset the counter if it's been 30+ days since the cycle started
    if (daysSinceCycleStart >= 30) {
      await User.updateOne(
        { _id: user._id },
        { $set: { analysisCount: 0, analysisCycleStart: now } }
      );
      user.analysisCount = 0;
      user.analysisCycleStart = now;
    }
    console.log("DEBUG - plan:", user.plan, "count:", user.analysisCount, "email:", user.email);
    if ((user.plan ?? "free") !== "pro" && (user.analysisCount ?? 0) >= FREE_LIMIT) {
      throw ApiError.badRequest(
        "You've reached your free plan limit of 2 resume checks this month. Upgrade to Pro for unlimited checks."
      );
    }
    // ---- End limit check ----

    const versionId = req.body.versionId || resume.currentVersionId;
    if (!versionId) throw ApiError.badRequest("No version to analyze");
    const version = await loadVersion(resume._id, versionId);

    const { analysis, model, promptTokens, responseTokens } =
      await analyzeResume({
        rawText: version.rawText,
        targetRole: req.body.targetRole,
      });

    const saved = await Analysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      versionId: version._id,
      atsScore: analysis.atsScore,
      scoreBreakdown: analysis.scoreBreakdown,
      issues: analysis.issues,
      strengths: analysis.strengths,
      bulletRewrites: analysis.bulletRewrites,
      keywordsPresent: analysis.keywordsPresent,
      keywordsMissing: analysis.keywordsMissing,
      summary: analysis.summary,
      model,
      promptTokens,
      responseTokens,
    });

    version.latestAnalysisId = saved._id;
    await version.save();

    // ---- Increment usage count for free users ----
    if (user.plan !== "pro") {
      await User.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );
    }
    // ---- End increment ----

    res.status(201).json({ analysis: saved });
  })
);

router.get(
  "/:id/analyses",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);
    const analyses = await Analysis.find({ resumeId: resume._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ analyses });
  })
);

router.get(
  "/:id/versions/:versionId/analysis",
  validate(
    z.object({ id: objectIdSchema, versionId: objectIdSchema }),
    "params"
  ),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);
    const version = await loadVersion(resume._id, req.params.versionId);
    const analysis = await Analysis.findOne({
      resumeId: resume._id,
      versionId: version._id,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ analysis: analysis || null });
  })
);

const rewriteBody = z.object({
  analysisId: objectIdSchema,
  rewriteIds: z.array(objectIdSchema).optional(), // omit/empty = apply all
  label: z.string().trim().max(40).optional(),
});

function normalizeForMatch(str) {
  return str.replace(/\s+/g, " ").trim();
}

function buildNormalizedMap(text) {
  let normalized = "";
  const map = [];
  let lastWasSpace = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (!lastWasSpace && normalized.length > 0) {
        normalized += " ";
        map.push(i);
        lastWasSpace = true;
      }
    } else {
      normalized += ch;
      map.push(i);
      lastWasSpace = false;
    }
  }

  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    map.pop();
  }

  return { normalized, map };
}

function applyRewritesToText(rawText, rewrites) {
  let result = rawText;

  for (const r of rewrites) {
    if (!r.original || !r.rewritten) continue;

    // 1. Try exact match first (fastest, most common case)
    const idx = result.indexOf(r.original);
    if (idx >= 0) {
      result =
        result.slice(0, idx) + r.rewritten + result.slice(idx + r.original.length);
      continue;
    }

    // 2. Whitespace-tolerant match: normalize both the full text and the
    //    target phrase, find the phrase's position in the normalized text,
    //    then map that position back to the exact real offsets in the
    //    original text. This only ever replaces one contiguous, correctly
    //    located span — never a guessed word-to-word range.
    const { normalized, map } = buildNormalizedMap(result);
    const normalizedOriginal = normalizeForMatch(r.original);
    const matchIdx = normalized.indexOf(normalizedOriginal);

    if (matchIdx >= 0 && map.length > 0) {
      const startOrig = map[matchIdx];
      const endOrig = map[matchIdx + normalizedOriginal.length - 1] + 1;
      result = result.slice(0, startOrig) + r.rewritten + result.slice(endOrig);
      continue;
    }

    // No safe match found — skip rather than guess. The structured-sections
    // patch (patchBulletsInSections) remains the fallback for this case.
  }

  return result;
}

function patchBulletsInSections(sections, rewrites) {
  if (!sections) return null;
  const cloned = JSON.parse(JSON.stringify(sections));
  for (const r of rewrites) {
    if (!r?.original || !r?.rewritten) continue;
    for (const exp of cloned.experience || []) {
      if (!Array.isArray(exp.bullets)) continue;
      exp.bullets = exp.bullets.map((b) =>
        b === r.original ? r.rewritten : b
      );
    }
  }
  return cloned;
}

function looksEmpty(sections) {
  if (!sections) return true;
  const b = sections.basics || {};
  const hasIdentity = b.name || b.email || b.title;
  const hasBody =
    sections.summary ||
    sections.experience?.length ||
    sections.education?.length ||
    sections.skills?.length;
  return !hasIdentity && !hasBody;
}

router.post(
  "/:id/rewrite",
  validate(idParam, "params"),
  validate(rewriteBody),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);

    const analysis = await Analysis.findOne({
      _id: req.body.analysisId,
      resumeId: resume._id,
    });
    if (!analysis) throw ApiError.notFound("Analysis not found");

    const baseVersion = await loadVersion(resume._id, analysis.versionId);

    const selected = req.body.rewriteIds?.length
      ? analysis.bulletRewrites.filter((r) =>
          req.body.rewriteIds.includes(r._id.toString())
        )
      : analysis.bulletRewrites;

    if (!selected.length) {
      throw ApiError.badRequest("No rewrites selected to apply");
    }

    const newRaw = applyRewritesToText(baseVersion.rawText, selected);

    // Safety net: pre-build a structured copy from the base version with the
    // chosen bullets swapped in, so V2 never lands with empty sections even if
    // Gemini's re-parse fails.
    const patchedFromBase = patchBulletsInSections(
      baseVersion.parsedSections,
      selected
    );

    const reparsed = await parseStructured(newRaw);
    const finalParsed = looksEmpty(reparsed) ? patchedFromBase : reparsed;

    const nextNumber = resume.latestVersionNumber + 1;

    const newVersion = await ResumeVersion.create({
      resumeId: resume._id,
      versionNumber: nextNumber,
      label: req.body.label?.trim() || `V${nextNumber}`,
      rawText: newRaw,
      parsedSections: finalParsed,
      sourceType: "rewrite",
      parentVersionId: baseVersion._id,
    });

    resume.latestVersionNumber = nextNumber;
    resume.currentVersionId = newVersion._id;
    await resume.save();

    res.status(201).json({
      version: newVersion,
      appliedCount: selected.length,
    });
  })
);

const diffQuery = z.object({
  from: objectIdSchema,
  to: objectIdSchema,
  mode: z.enum(["words", "lines"]).optional(),
});

router.get(
  "/:id/diff",
  validate(idParam, "params"),
  validate(diffQuery, "query"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnedResume(req);
    const [fromV, toV] = await Promise.all([
      loadVersion(resume._id, req.query.from),
      loadVersion(resume._id, req.query.to),
    ]);

    const parts = diffText(fromV.rawText, toV.rawText, req.query.mode);
    res.json({
      from: { id: fromV._id, label: fromV.label, versionNumber: fromV.versionNumber },
      to: { id: toV._id, label: toV.label, versionNumber: toV.versionNumber },
      parts,
      stats: summarize(parts),
    });
  })
);

module.exports = router;