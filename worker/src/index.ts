import type { Env } from "./lib/env";
import { corsHeaders, json } from "./lib/http";
import { handleHealth } from "./routes/health";
import {
  handleSignup, handleLogin, handleGoogleSignIn,
  handleVerifyEmail, handleForgotPassword, handleResetPassword,
  handleMe, handleAdminLogin, handleAdminListStudents,
} from "./routes/auth";
import {
  handleCreateCheckout, handleStripeWebhook, handleCreatePortal, handleSubscriptionStatus,
} from "./routes/stripe";
import {
  handleGetSubjects, handleGetSubjectFiles, handleGetSubjectIcon,
  handleGetTopics, handleGetFiles, handleGetFileUrl, handleViewFile,
  handleAdminCreateSubject, handleAdminUpdateSubject, handleAdminDeleteSubject,
  handleAdminUploadSubjectIcon,
  handleAdminCreateTopic, handleAdminUpdateTopic, handleAdminDeleteTopic,
  handleAdminUploadFile, handleAdminDeleteFile,
} from "./routes/content";
import {
  handleGetPapers, handleGetQuestions, handleCheckAnswer,
  handleAdminCreatePaper, handleAdminUpdatePaper, handleAdminDeletePaper,
  handleAdminCreateQuestion, handleAdminUpdateQuestion, handleAdminDeleteQuestion,
  handleAdminListQuestions, handleAdminImportQuestions,
} from "./routes/papers";
import {
  handleGetDecks, handleGetStudyCards, handleReviewCard,
  handleAdminListDecks, handleAdminCreateDeck, handleAdminUpdateDeck, handleAdminDeleteDeck,
  handleAdminListCards, handleAdminCreateCard, handleAdminUpdateCard, handleAdminDeleteCard,
  handleAdminImportCards,
} from "./routes/flashcards";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type,authorization",
        },
      });
    }

    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    let m: RegExpMatchArray | null = null;

    let response: Response;

    if (pathname === "/api/health") {
      response = await handleHealth(env);
    } else if (pathname === "/api/auth/signup"       && method === "POST") { response = await handleSignup(request, env);
    } else if (pathname === "/api/auth/login"         && method === "POST") { response = await handleLogin(request, env);
    } else if (pathname === "/api/auth/google"        && method === "POST") { response = await handleGoogleSignIn(request, env);
    } else if (pathname === "/api/auth/verify-email"  && method === "GET")  { response = await handleVerifyEmail(request, env);
    } else if (pathname === "/api/auth/forgot-password" && method === "POST") { response = await handleForgotPassword(request, env);
    } else if (pathname === "/api/auth/reset-password"  && method === "POST") { response = await handleResetPassword(request, env);
    } else if (pathname === "/api/auth/me"            && method === "GET")  { response = await handleMe(request, env);
    } else if (pathname === "/api/admin/login"        && method === "POST") { response = await handleAdminLogin(request, env);
    } else if (pathname === "/api/admin/students"     && method === "GET")  { response = await handleAdminListStudents(request, env);
    } else if (pathname === "/api/stripe/checkout"    && method === "POST") { response = await handleCreateCheckout(request, env);
    } else if (pathname === "/api/stripe/webhook"     && method === "POST") { response = await handleStripeWebhook(request, env);
    } else if (pathname === "/api/stripe/portal"      && method === "POST") { response = await handleCreatePortal(request, env);
    } else if (pathname === "/api/stripe/status"      && method === "GET")  { response = await handleSubscriptionStatus(request, env);
    // ── Content: student browse ──────────────────────────────────────────────
    } else if (pathname === "/api/content/subjects"   && method === "GET")  { response = await handleGetSubjects(request, env);
    } else if ((m = pathname.match(/^\/api\/content\/subjects\/(\d+)\/files$/)))  { response = await handleGetSubjectFiles(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/content\/subject-icons\/(\d+)$/)))    { response = await handleGetSubjectIcon(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/content\/subjects\/(\d+)\/topics$/))) { response = await handleGetTopics(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/content\/topics\/(\d+)\/files$/)))    { response = await handleGetFiles(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/content\/files\/(\d+)\/url$/)))       { response = await handleGetFileUrl(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/content\/view\/(\d+)$/)))             { response = await handleViewFile(request, env, m[1]);
    // ── Content: admin CRUD ──────────────────────────────────────────────────
    } else if (pathname === "/api/admin/subjects"     && method === "POST") { response = await handleAdminCreateSubject(request, env);
    } else if ((m = pathname.match(/^\/api\/admin\/subjects\/(\d+)\/icon$/))  && method === "POST") { response = await handleAdminUploadSubjectIcon(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/subjects\/(\d+)$/))        && method === "PUT")  { response = await handleAdminUpdateSubject(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/subjects\/(\d+)$/))        && method === "DELETE") { response = await handleAdminDeleteSubject(request, env, m[1]);
    } else if (pathname === "/api/admin/topics"       && method === "POST") { response = await handleAdminCreateTopic(request, env);
    } else if ((m = pathname.match(/^\/api\/admin\/topics\/(\d+)$/))          && method === "PUT")    { response = await handleAdminUpdateTopic(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/topics\/(\d+)$/))          && method === "DELETE") { response = await handleAdminDeleteTopic(request, env, m[1]);
    } else if (pathname === "/api/admin/files/upload" && method === "POST") { response = await handleAdminUploadFile(request, env);
    } else if ((m = pathname.match(/^\/api\/admin\/files\/(\d+)$/))           && method === "DELETE") { response = await handleAdminDeleteFile(request, env, m[1]);
    // ── Past papers: student ─────────────────────────────────────────────────
    } else if (pathname === "/api/papers"             && method === "GET")  { response = await handleGetPapers(request, env);
    } else if ((m = pathname.match(/^\/api\/papers\/(\d+)\/questions$/)))     { response = await handleGetQuestions(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/questions\/(\d+)\/check$/)))      { response = await handleCheckAnswer(request, env, m[1]);
    // ── Past papers: admin ───────────────────────────────────────────────────
    } else if (pathname === "/api/admin/papers"       && method === "POST") { response = await handleAdminCreatePaper(request, env);
    } else if ((m = pathname.match(/^\/api\/admin\/papers\/(\d+)$/))          && method === "PUT")    { response = await handleAdminUpdatePaper(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/papers\/(\d+)$/))          && method === "DELETE") { response = await handleAdminDeletePaper(request, env, m[1]);
    } else if (pathname === "/api/admin/questions"    && method === "POST") { response = await handleAdminCreateQuestion(request, env);
    } else if ((m = pathname.match(/^\/api\/admin\/questions\/(\d+)$/))       && method === "PUT")    { response = await handleAdminUpdateQuestion(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/questions\/(\d+)$/))       && method === "DELETE") { response = await handleAdminDeleteQuestion(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/papers\/(\d+)\/questions$/)))                      { response = await handleAdminListQuestions(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/papers\/(\d+)\/import-questions$/)) && method === "POST") { response = await handleAdminImportQuestions(request, env, m[1]);
    // ── Flashcards: student ──────────────────────────────────────────────────
    } else if (pathname === "/api/flashcards/decks"                                    && method === "GET")  { response = await handleGetDecks(request, env);
    } else if ((m = pathname.match(/^\/api\/flashcards\/decks\/(\d+)\/study$/)))                            { response = await handleGetStudyCards(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/flashcards\/cards\/(\d+)\/review$/))       && method === "POST") { response = await handleReviewCard(request, env, m[1]);
    // ── Flashcards: admin ────────────────────────────────────────────────────
    } else if (pathname === "/api/admin/decks"                                         && method === "GET")  { response = await handleAdminListDecks(request, env);
    } else if (pathname === "/api/admin/decks"                                         && method === "POST") { response = await handleAdminCreateDeck(request, env);
    } else if ((m = pathname.match(/^\/api\/admin\/decks\/(\d+)$/))            && method === "PUT")    { response = await handleAdminUpdateDeck(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/decks\/(\d+)$/))            && method === "DELETE") { response = await handleAdminDeleteDeck(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/decks\/(\d+)\/cards$/))     && method === "GET")    { response = await handleAdminListCards(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/decks\/(\d+)\/cards$/))     && method === "POST")   { response = await handleAdminCreateCard(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/cards\/(\d+)$/))            && method === "PUT")    { response = await handleAdminUpdateCard(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/cards\/(\d+)$/))            && method === "DELETE") { response = await handleAdminDeleteCard(request, env, m[1]);
    } else if ((m = pathname.match(/^\/api\/admin\/decks\/(\d+)\/import-cards$/)) && method === "POST") { response = await handleAdminImportCards(request, env, m[1]);
    } else {
      response = json({ error: "not found" }, { status: 404 });
    }

    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    return response;
  },
};
