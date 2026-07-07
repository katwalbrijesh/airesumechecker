const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
   plan: {
  type: String,
  enum: ["pro"],
  default: "pro",
},
type: {
  type: String,
  enum: ["full", "discount"],
  default: "full",
},
discountPercent: {
  type: Number,
  default: null, // only used when type is "discount", e.g. 50 = 50% off
},
stripeCouponId: {
  type: String,
  default: null, // links to a real Stripe Coupon object, only for "discount" type
},
    maxUses: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);