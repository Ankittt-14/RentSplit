import api from "./api";

export const authService = {
  register:      (data) => api.post("/auth/register", data),
  login:         (data) => api.post("/auth/login", data),
  getMe:         ()     => api.get("/auth/me"),
  updateProfile:  (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
  getStats:       ()     => api.get("/auth/stats"),
};

export const groupService = {
  getAll:         ()     => api.get("/groups"),
  getOne:         (id)   => api.get(`/groups/${id}`),
  create:         (data) => api.post("/groups", data),
  join:           (code) => api.post("/groups/join", { inviteCode: code }),
  getSummary:     (id)   => api.get(`/groups/${id}/summary`),
  getOwedSummary: ()     => api.get("/groups/owed-summary"),
  setBudget:      (id, b)=> api.put(`/groups/${id}/budget`, { budget: b }),
  getSettlements: (id)   => api.get(`/groups/${id}/settlements`),
  removeMember:   (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
};

export const expenseService = {
  getAll:  (groupId) => api.get(`/expenses/${groupId}`),
  getOne:  (id)      => api.get(`/expenses/detail/${id}`),
  create: (data) => api.post('/expenses', data).then(res => res.data),
  update: (id, data) => api.put(`/expenses/${id}`, data).then(res => res.data),
  delete: (id)   => api.delete(`/expenses/${id}`).then(res => res.data),
};

export const claimService = {
  getAll:  (groupId) => api.get(`/claims/${groupId}`),
  create:  (data)    => api.post("/claims", data),
  approve: (id)      => api.put(`/claims/${id}/approve`),
  reject:  (id)      => api.put(`/claims/${id}/reject`),
};

export const paymentService = {
  getAll:          (groupId)   => api.get(`/payments/${groupId}`),
  getDebts:        (groupId)   => api.get(`/payments/${groupId}/debts`),
  create:          (data)      => api.post("/payments", data),
  settle:          (data)      => api.post("/payments/settle", data),
  approvePayment:  (paymentId) => api.put(`/payments/settle/${paymentId}/approve`),
  rejectPayment:   (paymentId) => api.put(`/payments/settle/${paymentId}/reject`),
  remind:          (groupId)   => api.post(`/payments/${groupId}/remind`),
  remindAll:       ()          => api.post("/payments/remind-all"),
};

export const settlementService = {
  getAll:  (groupId) => api.get(`/settlements/${groupId}`),
  create:  (data)    => api.post("/settlements", data),
  delete:  (id)      => api.delete(`/settlements/${id}`),
};

export const notificationService = {
  getAll:      ()    => api.get("/notifications"),
  markRead:    (id)  => api.put(`/notifications/${id}`),
  markAllRead: ()    => api.put("/notifications/read-all"),
};