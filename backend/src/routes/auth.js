const express = require("express");
const { z } = require("zod");

const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { signToken, cookieOptions } = require("../utils/jwt");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const User = require("../models/User");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

function issueSession(res, user) {
  const token = signToken({ sub: user._id.toString() });
  res.cookie(env.cookieName, token, cookieOptions);
}

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict("Email already registered");

   const passwordHash = await User.hashPassword(password);
   const user = await User.create({ 
   name, 
   email, 
   passwordHash,
   plan: "free"
  });
    issueSession(res, user);
    res.status(201).json({ user });
  })
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) throw ApiError.unauthorized("Invalid credentials");

    const ok = await user.comparePassword(password);
    if (!ok) throw ApiError.unauthorized("Invalid credentials");

    issueSession(res, user);
    res.json({ user });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie(env.cookieName, { ...cookieOptions, maxAge: 0 });
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

router.patch(
    "/profile",
    requireAuth,
    validate(profileSchema),
    asyncHandler(async (req, res) => {
        req.user.name = req.body.name;
        await req.user.save();
        res.json({ user: req.user });
    })
);

router.patch(
    "/password",
    authLimiter,
    requireAuth,
    validate(passwordSchema),
    asyncHandler(async (req, res) => {
        const user = await User.findById(req.user._id).select("+passwordHash");
        if (!user) throw ApiError.unauthorized("Session no longer valid");

        const ok = await user.comparePassword(req.body.currentPassword);
        if (!ok) throw ApiError.unauthorized("Current password is incorrect");

        user.passwordHash = await User.hashPassword(req.body.newPassword);
        await user.save();
        res.json({ ok: true });
    })
);

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond the same way, whether the user exists or not
    // (prevents leaking which emails are registered)
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${process.env.CLIENT_ORIGIN.split(",")[0]}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

      await sendPasswordResetEmail({ to: email, resetUrl });
    }

    res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
  })
);

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email, token, newPassword } = req.body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw ApiError.badRequest("Invalid or expired reset link");
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ ok: true, message: "Password updated. You can now sign in." });
  })
);

module.exports = router;
