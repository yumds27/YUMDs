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

const BASE = import.meta.env.VITE_API_BASE ?? "https://api.yarmoukmds.com";

async function upload(path, formData) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Upload failed"), { status: res.status });
  return data;
}

export const api = {
  signup: (body) => request("POST", "/api/auth/signup", body),
  login:  (body) => request("POST", "/api/auth/login",  body),
  google: (credential) => request("POST", "/api/auth/google", { credential }),
  me:     () => request("GET", "/api/auth/me"),
  forgotPassword: (email) => request("POST", "/api/auth/forgot-password", { email }),
  resetPassword:  (token, password) => request("POST", "/api/auth/reset-password", { token, password }),
  // Content
  getSubjects: (year) => request("GET", `/api/content/subjects?year=${year}`),
  getTopics:   (subjectId) => request("GET", `/api/content/subjects/${subjectId}/topics`),
  getFiles:    (topicId) => request("GET", `/api/content/topics/${topicId}/files`),
  getFileUrl:  (fileId) => request("GET", `/api/content/files/${fileId}/url`),
  // Admin content
  createSubject: (body) => request("POST", "/api/admin/subjects", body),
  updateSubject: (id, body) => request("PUT", `/api/admin/subjects/${id}`, body),
  deleteSubject: (id) => request("DELETE", `/api/admin/subjects/${id}`),
  createTopic:   (body) => request("POST", "/api/admin/topics", body),
  updateTopic:   (id, body) => request("PUT", `/api/admin/topics/${id}`, body),
  deleteTopic:   (id) => request("DELETE", `/api/admin/topics/${id}`),
  uploadFile:    (formData) => upload("/api/admin/files/upload", formData),
  deleteFile:    (id) => request("DELETE", `/api/admin/files/${id}`),
};
