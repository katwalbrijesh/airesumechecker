const express = require("express");
const Stripe = require("stripe");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { requireAuth } = require("../middleware/auth");
const Coupon = require("../models/Coupon");
const User = require("../models/User");

//Stripe checkout
router.post(
  "/create-checkout-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { couponCode } = req.body;

    const sessionConfig = {
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Resume Roaster Pro",
            },
            unit_amount: 1900,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_ORIGIN.split(",")[0]}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_ORIGIN.split(",")[0]}/pricing`,
    };

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        type: "discount",
        isActive: true,
      });

      if (
        coupon &&
        coupon.stripeCouponId &&
        coupon.usedCount < coupon.maxUses &&
        !coupon.usedBy.includes(req.user._id) &&
        (!coupon.expiresAt || new Date() <= coupon.expiresAt)
      ) {
        sessionConfig.discounts = [{ coupon: coupon.stripeCouponId }];
        sessionConfig.metadata.couponId = coupon._id.toString();
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url });
  })
);

// Redeem coupon
router.post(
  "/redeem-coupon",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      throw ApiError.badRequest("Coupon code is required");
    }

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw ApiError.badRequest("Invalid or expired coupon code");
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw ApiError.badRequest("This coupon has expired");
    }

    if (coupon.usedCount >= coupon.maxUses) {
      throw ApiError.badRequest("This coupon has already been fully used");
    }

    if (coupon.usedBy.includes(req.user._id)) {
      throw ApiError.badRequest("You have already used this coupon");
    }

    //Discount coupons: validate only, apply at checkout
    if (coupon.type === "discount") {
      return res.json({
        ok: true,
        type: "discount",
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        message: `Coupon valid! ${coupon.discountPercent}% off your first month.`,
      });
    }

    //Full coupons: grant Pro immediately for 1 month 
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          plan: "pro",
          subscriptionStatus: "coupon",
          subscribedAt: now,
          currentPeriodEnd: oneMonthLater,
        },
      }
    );

    await Coupon.updateOne(
      { _id: coupon._id },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: req.user._id },
      }
    );

    res.json({
      ok: true,
      type: "full",
      message: "Coupon applied! You are now on the Pro plan.",
      plan: "pro",
    });
  })
);

//Stripe webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.userId;

      await User.updateOne(
        { _id: userId },
        { $set: { plan: "pro" } }
      );

      console.log("User upgraded to pro:", userId);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const periodEnd = subscription.items?.data?.[0]?.current_period_end;

      const isEnding =
        subscription.status === "canceled" ||
        subscription.status === "unpaid" ||
        subscription.status === "incomplete_expired";

      await User.updateOne(
        { stripeSubscriptionId: subscription.id },
        {
          $set: {
            subscriptionStatus: subscription.status,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            ...(isEnding ? { plan: "free" } : {}),
          },
        }
      );

      console.log(
        `Subscription ${subscription.id} updated: status=${subscription.status}, cancelAtPeriodEnd=${subscription.cancel_at_period_end}`
      );
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      await User.updateOne(
        { stripeSubscriptionId: subscription.id },
        {
          $set: {
            plan: "free",
            subscriptionStatus: "canceled",
          },
        }
      );

      console.log("Subscription ended, user downgraded to free:", subscription.id);
    }

    res.json({ received: true });
  })
);

//  Verify checkout session (fallback/confirmation for the frontend)
router.get(
  "/verify-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { session_id } = req.query;
    if (!session_id) throw ApiError.badRequest("session_id is required");

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata?.userId !== req.user._id.toString()) {
      throw ApiError.forbidden("This session does not belong to you");
    }

    if (session.payment_status === "paid" || session.status === "complete") {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);

      const updated = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            plan: "pro",
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
            subscribedAt: new Date(),
          },
        },
        { new: true }
      );

      if (session.metadata?.couponId) {
        await Coupon.updateOne(
          { _id: session.metadata.couponId, usedBy: { $ne: req.user._id } },
          { $inc: { usedCount: 1 }, $push: { usedBy: req.user._id } }
        );
      }

      return res.json({ ok: true, plan: "pro", user: updated });
    }

    res.json({ ok: true, plan: req.user.plan, pending: true });
  })
);

// Get current subscription details 
router.get(
  "/subscription",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;

    res.json({
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      paymentStatus:
        user.plan === "pro" && user.subscriptionStatus === "active"
          ? "paid"
          : user.plan === "pro"
          ? user.subscriptionStatus || "unknown"
          : null,
      subscribedAt: user.subscribedAt,
      currentPeriodEnd: user.currentPeriodEnd,
    });
  })
);

//Create Stripe Customer Portal session
router.post(
  "/create-portal-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user.stripeCustomerId) {
      throw ApiError.badRequest("No billing account found for this user");
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.CLIENT_ORIGIN.split(",")[0]}/subscription`,
    });

    res.json({ url: portalSession.url });
  })
);

module.exports = router;