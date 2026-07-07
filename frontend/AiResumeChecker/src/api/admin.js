import { apiClient } from "./client";

export const adminApi = {
  listCoupons: () => apiClient.get("/admin/coupons").then((r) => r.data),
  createCoupon: (payload) =>
    apiClient.post("/admin/coupons", payload).then((r) => r.data),
  deactivateCoupon: (id) =>
    apiClient.patch(`/admin/coupons/${id}/deactivate`).then((r) => r.data),
};