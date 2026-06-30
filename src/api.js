const BASE = import.meta.env.VITE_API_BASE ?? "https://api.yarmoukmds.com";

function getToken()      { return localStorage.getItem("token"); }
function getAdminToken() { return localStorage.getItem("admin_token"); }

async function request(method, path, body, useAdminToken = false) {
  const token = useAdminToken ? getAdminToken() : getToken();
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

async function upload(path, formData) {
  const token = getAdminToken() ?? getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Upload failed"), { status: res.status });
  return data;
}

const adm = (method, path, body) => request(method, path, body, true);

export const api = {
  // Student auth
  signup:         (body)            => request("POST", "/api/auth/signup", body),
  login:          (body)            => request("POST", "/api/auth/login",  body),
  google:         (credential)      => request("POST", "/api/auth/google", { credential }),
  me:             ()                => request("GET",  "/api/auth/me"),
  forgotPassword: (email)           => request("POST", "/api/auth/forgot-password", { email }),
  resetPassword:  (token, password) => request("POST", "/api/auth/reset-password", { token, password }),
  // Student content browse
  getSubjects:       (year)      => request("GET", `/api/content/subjects?year=${year}`),
  getSubjectFiles:   (subjectId) => request("GET", `/api/content/subjects/${subjectId}/files`),
  getTopics:         (subjectId) => request("GET", `/api/content/subjects/${subjectId}/topics`),
  getFiles:          (topicId)   => request("GET", `/api/content/topics/${topicId}/files`),
  getFileUrl:        (fileId)    => request("GET", `/api/content/files/${fileId}/url`),
  // Admin auth
  adminLogin:    (body) => request("POST", "/api/admin/login", body),
  // Admin content CRUD
  createSubject:      (body)             => adm("POST",   "/api/admin/subjects",              body),
  uploadSubjectIcon:  (subjectId, fd)    => upload(`/api/admin/subjects/${subjectId}/icon`,   fd),
  updateSubject:      (id, body)             => adm("PUT",    `/api/admin/subjects/${id}`,        body),
  deleteSubject: (id)   => adm("DELETE", `/api/admin/subjects/${id}`),
  createTopic:   (body) => adm("POST",   "/api/admin/topics",      body),
  updateTopic:   (id, body) => adm("PUT", `/api/admin/topics/${id}`,   body),
  deleteTopic:   (id)   => adm("DELETE", `/api/admin/topics/${id}`),
  uploadFile:    (formData) => upload("/api/admin/files/upload", formData),
  deleteFile:    (id)   => adm("DELETE", `/api/admin/files/${id}`),
  // Admin students
  getStudents: () => adm("GET", "/api/admin/students"),
  // Past papers (student)
  getPapers:          (year)       => request("GET", `/api/papers?year=${year}`),
  getPaperQuestions:  (paperId)    => request("GET", `/api/papers/${paperId}/questions`),
  checkAnswer:        (qId, ans)   => request("POST", `/api/questions/${qId}/check`, { answer: ans }),
  // Progress
  recordPaperSession: (body)   => request("POST", "/api/progress/paper-session", body),
  getProgressSessions: ()      => request("GET",  "/api/progress/sessions"),
  getSessionDetail:    (id)    => request("GET",  `/api/progress/sessions/${id}`),
  getFileProgress:     ()      => request("GET",  "/api/progress/files"),
  markFileComplete:    (fileId, completed) => request("POST", "/api/progress/file", { file_id: fileId, completed }),
  adminUploadExplanationImage: (qId, file) => {
    const fd = new FormData(); fd.append("file", file);
    return upload(`/api/admin/questions/${qId}/image`, fd);
  },
  adminGenerateSvg:   (qId)        => adm("POST", `/api/admin/questions/${qId}/generate-svg`),
  // Flashcards (student)
  getDecks:           ()            => request("GET",  "/api/flashcards/decks"),
  getStudyCards:      (deckId)      => request("GET",  `/api/flashcards/decks/${deckId}/study`),
  reviewCard:         (cardId, rating) => request("POST", `/api/flashcards/cards/${cardId}/review`, { rating }),
  // Flashcards (admin)
  getAbout:        ()     => request("GET", "/api/about"),
  adminGetAbout:   ()     => adm("GET",  "/api/about"),
  adminUpdateAbout:(body) => adm("PUT",  "/api/admin/about", body),
  adminImportQuestions: (paperId, body) => adm("POST", `/api/admin/papers/${paperId}/import-questions`, body),
  adminImportCards:     (deckId,  body) => adm("POST", `/api/admin/decks/${deckId}/import-cards`,        body),
  adminListDecks:     ()            => adm("GET",    "/api/admin/decks"),
  adminCreateDeck:    (body)        => adm("POST",   "/api/admin/decks",              body),
  adminUpdateDeck:    (id, body)    => adm("PUT",    `/api/admin/decks/${id}`,         body),
  adminDeleteDeck:    (id)          => adm("DELETE", `/api/admin/decks/${id}`),
  adminListCards:     (deckId)      => adm("GET",    `/api/admin/decks/${deckId}/cards`),
  adminCreateCard:    (deckId, body) => adm("POST",  `/api/admin/decks/${deckId}/cards`, body),
  adminUpdateCard:    (id, body)    => adm("PUT",    `/api/admin/cards/${id}`,         body),
  adminDeleteCard:    (id)          => adm("DELETE", `/api/admin/cards/${id}`),
  // Past papers (admin)
  createPaper:        (body)       => adm("POST",   "/api/admin/papers",             body),
  updatePaper:        (id, body)   => adm("PUT",    `/api/admin/papers/${id}`,        body),
  deletePaper:        (id)         => adm("DELETE", `/api/admin/papers/${id}`),
  createQuestion:     (body)       => adm("POST",   "/api/admin/questions",           body),
  updateQuestion:     (id, body)   => adm("PUT",    `/api/admin/questions/${id}`,     body),
  deleteQuestion:     (id)         => adm("DELETE", `/api/admin/questions/${id}`),
  adminGetQuestions:  (paperId)    => adm("GET",    `/api/admin/papers/${paperId}/questions`),
};
