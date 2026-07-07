const ApiError = require("../utils/ApiError");

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    throw ApiError.forbidden("Admin access required");
  }
  next();
}

module.exports = { requireAdmin };