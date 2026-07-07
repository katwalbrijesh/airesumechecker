const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
      name: { type: String, required: true, trim: true, maxlength: 80 },

      plan: { type: String, enum: ["free", "pro"], default: "free" },
      isAdmin: { type: Boolean, default: false },
      
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      subscriptionStatus: { type: String, default: null },
      currentPeriodEnd: { type: Date, default: null },
      subscribedAt: { type: Date, default: null },

      analysisCount: { type: Number, default: 0 },
      analysisCycleStart: { type: Date, default: Date.now },

      resetPasswordTokenHash: { type: String, default: null },
      resetPasswordExpires: { type: Date, default: null },
    },
  {  timestamps: true }
    );

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
