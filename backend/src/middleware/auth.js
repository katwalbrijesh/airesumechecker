const env = require("../config/env");
const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[env.cookieName];
    if (!token) throw ApiError.unauthorized();

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
if (!user) throw ApiError.unauthorized("Session no longer valid");

// Lazily downgrade expired coupon-based Pro access
if (
  user.plan === "pro" &&
  user.subscriptionStatus === "coupon" &&
  user.currentPeriodEnd &&
  user.currentPeriodEnd < new Date()
) {
  user.plan = "free";
  user.subscriptionStatus = "expired";
  await user.save();
}

req.user = user;
next();

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Invalid or expired session"));
    }
    next(err);
  }
}

module.exports = { requireAuth };
