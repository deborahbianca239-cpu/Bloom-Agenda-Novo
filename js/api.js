/* =====================================================================
   Bloom Agenda — cliente da API REST (compartilhado por todas as telas)
   ===================================================================== */
(function (global) {
  // Local/Docker: o backend roda na porta 3006 (origem diferente do nginx).
  // Vercel/produção: API no mesmo domínio, sob /api.
  const host = global.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const API_BASE = isLocal ? "http://localhost:3006/api" : "/api";

  const TOKEN_KEY = "bloom_token";
  const USER_KEY = "bloom_user";

  /* ---------- Sessão ---------- */
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  };
  const setUser = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
  const isAuthenticated = () => !!getToken();

  /* ---------- Núcleo de requisição ---------- */
  async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiClientError(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando.",
        0
      );
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      /* resposta sem corpo */
    }

    if (!res.ok) {
      // Token expirado/ inválido → encerra sessão.
      if (res.status === 401 && auth) clearSession();
      throw new ApiClientError(
        data.message || "Erro na requisição",
        res.status,
        data.errors
      );
    }
    return data;
  }

  class ApiClientError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.status = status;
      this.errors = errors;
    }
  }

  /* ---------- Auth ---------- */
  const auth = {
    register: (payload) =>
      request("/auth/register", { method: "POST", body: payload, auth: false }),
    login: (payload) =>
      request("/auth/login", { method: "POST", body: payload, auth: false }),
    forgotPassword: (email) =>
      request("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      }),
    resetPassword: (token, novaSenha) =>
      request("/auth/reset-password", {
        method: "POST",
        body: { token, novaSenha },
        auth: false,
      }),
    changePassword: (senhaAtual, novaSenha) =>
      request("/auth/change-password", {
        method: "PUT",
        body: { senhaAtual, novaSenha },
      }),
    profile: () => request("/auth/profile"),
    updateName: (nome) =>
      request("/auth/profile", { method: "PUT", body: { nome } }),
  };

  /* ---------- Tasks ---------- */
  const tasks = {
    list: (filters = {}) => {
      const qs = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null)
      ).toString();
      return request(`/tasks${qs ? "?" + qs : ""}`);
    },
    get: (id) => request(`/tasks/${id}`),
    create: (payload) => request("/tasks", { method: "POST", body: payload }),
    update: (id, payload) =>
      request(`/tasks/${id}`, { method: "PUT", body: payload }),
    complete: (id) => request(`/tasks/${id}/complete`, { method: "PATCH" }),
    uncomplete: (id) => request(`/tasks/${id}/uncomplete`, { method: "PATCH" }),
    remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  };

  /* ---------- Dashboard ---------- */
  const dashboard = {
    today: () => request("/dashboard/today"),
    tomorrow: () => request("/dashboard/tomorrow"),
    upcoming: () => request("/dashboard/upcoming"),
    statistics: () => request("/dashboard/statistics"),
  };

  global.BloomAPI = {
    getToken,
    setToken,
    getUser,
    setUser,
    clearSession,
    isAuthenticated,
    auth,
    tasks,
    dashboard,
    ApiClientError,
  };
})(window);
