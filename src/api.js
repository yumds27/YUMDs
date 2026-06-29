const BASE = import.meta.env.VITE_API_BASE ?? "https://api.yarmoukmds.com";

async function request(method, path, body) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status });
  return data;
}

export const api = {
  signup: (body) => request("POST", "/api/auth/signup", body),
  login:  (body) => request("POST", "/api/auth/login",  body),
  google: (credential) => request("POST", "/api/auth/google", { credential }),
  me:     () => request("GET", "/api/auth/me"),
  forgotPassword: (email) => request("POST", "/api/auth/forgot-password", { email }),
  resetPassword:  (token, password) => request("POST", "/api/auth/reset-password", { token, password }),
};
