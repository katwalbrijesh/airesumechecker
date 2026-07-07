const express = require("express");
const { z } = require("zod");
const Stripe = require("stripe");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { validate } = require("../middleware/validate");
const Coupon = require("../models/Coupon");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get(
  "/coupons",
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  })
);

const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(32),
  type: z.enum(["full", "discount"]),
  discountPercent: z.number().min(1).max(100).optional(),
  maxUses: z.number().min(1).max(1000).default(1),
  expiresInDays: z.number().min(1).max(365).optional(),
});

router.post(
  "/coupons",
  validate(createCouponSchema),
  asyncHandler(async (req, res) => {
    const { code, type, discountPercent, maxUses, expiresInDays } = req.body;

    if (type === "discount" && !discountPercent) {
      throw ApiError.badRequest("discountPercent is required for discount coupons");
    }

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      throw ApiError.conflict("A coupon with this code already exists");
    }

    let stripeCouponId = null;

    if (type === "discount") {
      const stripeCoupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "once",
        name: `${code.trim().toUpperCase()} - ${discountPercent}% off first month`,
      });
      stripeCouponId = stripeCoupon.id;
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      type,
      discountPercent: type === "discount" ? discountPercent : null,
      stripeCouponId,
      maxUses: type === "discount" ? 1 : maxUses,
      expiresAt,
      isActive: true,
    });

    res.status(201).json({ coupon });
  })
);

router.patch(
  "/coupons/:id/deactivate",
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!coupon) throw ApiError.notFound("Coupon not found");
    res.json({ coupon });
  })
);

module.exports = router;