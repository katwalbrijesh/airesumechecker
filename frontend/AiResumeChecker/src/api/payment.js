import { apiClient } from "./client";

export const paymentApi = {
  createCheckoutSession: (couponCode) =>
  apiClient
    .post("/payment/create-checkout-session", couponCode ? { couponCode } : {})
    .then((r) => r.data),
  verifySession: (sessionId) =>
    apiClient
      .get("/payment/verify-session", { params: { session_id: sessionId } })
      .then((r) => r.data),
  redeemCoupon: (code) =>
    apiClient.post("/payment/redeem-coupon", { code }).then((r) => r.data),
  getSubscription: () =>
    apiClient.get("/payment/subscription").then((r) => r.data),
  createPortalSession: () =>
    apiClient.post("/payment/create-portal-session").then((r) => r.data),
};