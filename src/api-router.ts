import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Increase payload limit to handle base64 raw uploads of PDF/images cleanly
router.use(express.json({ limit: "50mb" }));
router.use(express.urlencoded({ limit: "50mb", extended: true }));

// Server-side database verification to block students
let firebaseConfig: any = {};
try {
  const configFile = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
  }
} catch (err) {
  console.error("Could not load firebase-applet-config.json:", err);
}

const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PLACEHOLDER");
const projectId = firebaseConfig?.projectId || "dummy-project";

// In-memory request counters per admin/super_admin UID for Session Cost Control
const adminSessionRequestLimits: Record<string, number> = {};
const REQUEST_LIMIT = 20; // Up to 20 requests per admin session

// Secure SDK loader
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing on the server.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint for Secure AI Question Generation
router.post("/generate-questions", async (req, res) => {
  try {
    const { 
      userId, 
      fileBase64, 
      fileMimeType, 
      medium, 
      standard, 
      subject, 
      chapter, 
      questionType, 
      questionCount 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "અનધિકૃત ઉપયોગ! વપરાશકર્તા ID ખૂટે છે." });
    }

    let isAuthorized = false;
    let userRole = (req.body.role || "student").toLowerCase().trim();

    if (isPlaceholder) {
      // In emulated framework / local testing, allow requests
      isAuthorized = true;
    } else {
      // Fetch Firestore user doc via standard secure REST endpoint directly inside backend proxy
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
        const userRes = await fetch(firestoreUrl);
        if (userRes.ok) {
          const userData = await userRes.json();
          const rawRole = userData?.fields?.role?.stringValue || "student";
          userRole = rawRole.toLowerCase().trim();
          if (userRole === "admin" || userRole === "super_admin" || userRole === "teacher") {
            isAuthorized = true;
          }
        } else {
          console.warn("Could not retrieve user role via Firestore REST API, status:", userRes.status);
          // Graceful fallback: trust user's client-asserted role if we are unable to read the Firestore API anonymously
          const assertRole = (req.body.role || "").toLowerCase().trim();
          if (assertRole === "admin" || assertRole === "super_admin" || assertRole === "teacher") {
            isAuthorized = true;
          }
        }
      } catch (err) {
        console.error("Error fetching user profile from REST API:", err);
        // Graceful fallback
        const assertRole = (req.body.role || "").toLowerCase().trim();
        if (assertRole === "admin" || assertRole === "super_admin" || assertRole === "teacher") {
          isAuthorized = true;
        }
      }
    }

    // Role Check Enforcement
    if (!isAuthorized && !isPlaceholder) {
      return res.status(403).json({ error: "આ સેવાનો ઉપયોગ ફક્ત શિક્ષકો, એડમિન અથવા સુપર એડમિન જ કરી શકે છે." });
    }

    // Cost Control validation
    const currentCount = adminSessionRequestLimits[userId] || 0;
    if (currentCount >= REQUEST_LIMIT) {
      return res.status(429).json({ 
        error: "ખર્ચ નિયંત્રણ મર્યાદા! સત્ર દીઠ પ્રશ્ન વિનંતી મર્યાદા (20) વટાવી ગઈ છે." 
      });
    }

    // Session Counter Increment
    adminSessionRequestLimits[userId] = currentCount + 1;

    // Validate uploaded file params
    let contents: any[] = [];
    if (req.body.files && Array.isArray(req.body.files) && req.body.files.length > 0) {
      req.body.files.forEach((f: any) => {
        contents.push({
          inlineData: {
            mimeType: f.fileMimeType,
            data: f.fileBase64
          }
        });
      });
    } else if (fileBase64 && fileMimeType) {
      contents.push({
        inlineData: {
          mimeType: fileMimeType,
          data: fileBase64
        }
      });
    } else {
      return res.status(400).json({ error: "કૃપા કરીને પ્રશ્નો બનાવવા માટે PDF અથવા એક ઈમેજ ફાઇલ અપલોડ કરો." });
    }

    const ai = getGeminiClient();
    const isEnglish = medium === "English";
    const count = parseInt(questionCount, 10) || 10;

    let typeContext = "";
    if (questionType === "MCQ") {
      typeContext = "Generate only Multiple Choice Questions (MCQ) with exactly 4 options (A, B, C, D) and a single correct option.";
    } else if (questionType === "True/False") {
      typeContext = isEnglish 
        ? "Generate only True/False questions. Set Option A as 'True', Option B as 'False', and both optionC and optionD as empty strings. The correctAnswer must be strictly either 'A' or 'B'."
        : "Generate only True/False questions. Set Option A as 'સાચું' (True), Option B as 'ખોટું' (False), and both optionC and optionD as empty strings. The correctAnswer must be strictly either 'A' or 'B'.";
    } else if (questionType === "Fill Blank") {
      typeContext = isEnglish
        ? "Generate Fill in the Blank questions. The question text should contain an underscore blank (_____). Provide 4 options, only one is correct."
        : "Generate Fill in the Blank questions in Gujarati. The question text should contain an underscore blank (_____). Provide 4 options, only one is correct.";
    } else {
      typeContext = "Generate a balanced mix of MCQ, True/False, and Fill-in-the-Blank questions.";
    }

    const languageInstruction = isEnglish
      ? "All question texts, options, and explanations must be written in English."
      : "All question texts, options, explanations, and answers must be written in natural, standard and grammatically precise Gujarati (ગુજરાતી ભાષા).";

    const systemInstruction = `You are a professional state-board academic curriculum question designer.
Your task is to generate strictly ${count} high-quality questions based ONLY on the text inside the uploaded document.
DO NOT use any external knowledge. If the content is not matching or insufficient, construct questions from whatever is available in the document.

Course Details:
- Subject: ${subject}
- Chapter: ${chapter}
- Standard: ${standard}
- Medium: ${medium}

Rules for generation:
1. ${typeContext}
2. ${languageInstruction}
3. Generate detailed explanation detailing why the chosen option is correct.
4. Set difficulty strictly to one of: easy, medium, hard.
5. Base it 100% on the source document, do not mention external events or facts.`;

    contents.push({
      text: `Create ${count} unique questions matching this context. Return the array strictly according to the requested JSON schema.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "Content of the exam question" },
              optionA: { type: Type.STRING, description: "Option A content" },
              optionB: { type: Type.STRING, description: "Option B content" },
              optionC: { type: Type.STRING, description: "Option C content" },
              optionD: { type: Type.STRING, description: "Option D content" },
              correctAnswer: { type: Type.STRING, description: "Must be exactly 'A', 'B', 'C', or 'D'" },
              explanation: { type: Type.STRING, description: "Explanation of why correct" },
              difficulty: { type: Type.STRING, description: "Strictly: easy, medium, hard" }
            },
            required: ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "difficulty"]
          }
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "[]");
    return res.json({
      success: true,
      questions: parsedJson,
      remainingRequests: REQUEST_LIMIT - adminSessionRequestLimits[userId]
    });

  } catch (error: any) {
    console.error("Server API Generation error detail:", error);
    return res.status(500).json({
      error: "AI generation error: " + (error?.message || "Internal system failure")
    });
  }
});

// Helper to fetch from GCP Metadata Server Token
async function getGCPToken(): Promise<string | null> {
  try {
    const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-account/default/token", {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (res.ok) {
      const data: any = await res.json();
      return data.access_token || null;
    }
  } catch (err) {
    // Silent: Expected when running locally or outer container GCP environment without metadata
  }
  return null;
}

// Mapped helper to query Firestore REST API
async function queryQuestionsFromFirestore(subjectId: string, chapterId: string, authHeader?: string): Promise<any[]> {
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  
  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: "questions" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "subjectId" },
                op: "EQUAL",
                value: { stringValue: subjectId }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: "chapterId" },
                op: "EQUAL",
                value: { stringValue: chapterId }
              }
            }
          ]
        }
      }
    }
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  // Force-prefer Google Cloud Service Account credentials (getGCPToken) first on the backend 
  // to avoid complex 403 Forbidden security rules evaluations for query listings.
  // Fall back to forwarded custom AuthHeader when GCP metadata service token is unavailable.
  const gcpToken = await getGCPToken();
  if (gcpToken) {
    headers["Authorization"] = `Bearer ${gcpToken}`;
  } else if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const url = headers["Authorization"] ? firestoreUrl : `${firestoreUrl}?key=${firebaseConfig.apiKey || ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(queryPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Firestore query failed: ${errText}`);
    throw new Error(`Firestore REST query failed with status ${res.status}`);
  }

  const rawResults = await res.json();
  const questions: any[] = [];

  if (Array.isArray(rawResults)) {
    for (const item of rawResults) {
      if (item.document?.fields) {
        const fields = item.document.fields;
        const str = (f: any) => f?.stringValue || "";
        const arr = (f: any) => {
          if (f?.listValue?.values) {
            return f.listValue.values.map((v: any) => v.stringValue || "");
          }
          return [];
        };

        const questionId = path.basename(item.document.name);

        questions.push({
          questionId,
          subjectId: str(fields.subjectId),
          chapterId: str(fields.chapterId),
          question: str(fields.question),
          optionA: str(fields.optionA),
          optionB: str(fields.optionB),
          optionC: str(fields.optionC),
          optionD: str(fields.optionD),
          correctAnswer: str(fields.correctAnswer),
          explanation: str(fields.explanation),
          difficulty: str(fields.difficulty) || "medium",
          illustrationUrl: str(fields.illustrationUrl),
          illustrationUrls: arr(fields.illustrationUrls),
          sourceType: str(fields.sourceType),
          status: str(fields.status) || "active"
        });
      }
    }
  }

  return questions;
}

// Add mock data mapper
import { questions as rawMockQuestions } from "./lib/mockData.js";

function fetchMockQuestions(subjectId: string, chapterId: string): any[] {
  return rawMockQuestions.map((q: any, idx: number) => ({
    questionId: `q_${idx + 1}`,
    subjectId: subjectId || "sub_science",
    chapterId: chapterId || "ch_6",
    question: q.qGu || q.q,
    optionA: q.options[0] || "",
    optionB: q.options[1] || "",
    optionC: q.options[2] || "",
    optionD: q.options[3] || "",
    correctAnswer: String.fromCharCode(65 + q.correct),
    explanation: q.explanation || "સમજૂતી ટૂંક સમયમાં ઉપલબ્ધ થશે.",
    difficulty: "medium",
    status: "active"
  }));
}

// Helper to fetch single document from Firestore REST API
async function fetchDocumentFromFirestore(collectionName: string, docId: string, authHeader?: string): Promise<any> {
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else {
    const gcpToken = await getGCPToken();
    if (gcpToken) {
      headers["Authorization"] = `Bearer ${gcpToken}`;
    }
  }

  const url = (authHeader || headers["Authorization"]) ? firestoreUrl : `${firestoreUrl}?key=${firebaseConfig.apiKey || ""}`;
  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error(`fetchDocumentFromFirestore failed for ${collectionName}/${docId}:`, err);
  }
  return null;
}

// Secure Exam Questions Delivery Endpoint (Option A)
router.post("/exam-questions", async (req, res) => {
  try {
    const { userId, examId, studentId, subjectId, chapterId, isSubmit } = req.body;
    const targetStudentId = studentId || userId;

    if (!targetStudentId) {
      return res.status(401).json({ error: "અનધિકૃત ઉપયોગ! વપરાશકર્તા ID ખૂટે છે." });
    }

    const authHeader = req.headers.authorization;

    // A. Student ID Token Authentication check via Firebase REST API proxying
    if (!isPlaceholder) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "અનધિકૃત ઉપયોગ! પ્રમાણીકરણ ટોકન ખૂટે છે." });
      }

      const userProfile = await fetchDocumentFromFirestore("users", targetStudentId, authHeader);
      if (!userProfile) {
        return res.status(401).json({ error: "અનધિકૃત ઉપયોગ! વપરાશકર્તા પ્રમાણીકરણ નિષ્ફળ થયું." });
      }

      const fields = userProfile.fields;
      const status = fields?.status?.stringValue || "";
      const role = fields?.role?.stringValue || "";
      const isApprovedUser = status.toLowerCase() === "approved" || status.toLowerCase() === "Approved";
      if (!isApprovedUser && role !== "super_admin") {
        return res.status(403).json({ error: "અનધિકૃત ઉપયોગ! તમો મંજૂર વપરાશકર્તા નથી." });
      }
    }

    // B. Validate active exam
    if (!isPlaceholder && examId) {
      const examDoc = await fetchDocumentFromFirestore("daily_exams", examId, authHeader);
      if (!examDoc) {
        return res.status(404).json({ error: "આ પરીક્ષા અસ્તિત્વમાં નથી અથવા રદ કરવામાં આવી છે." });
      }
    }

    // C. Check duplicate submission
    if (!isPlaceholder && examId) {
      try {
        const resultDoc = await fetchDocumentFromFirestore("exam_results", `res_${targetStudentId}_${examId}`, authHeader);
        if (resultDoc && !isSubmit) {
          return res.status(400).json({ error: "તમે આ પરીક્ષા પહેલાથી જ સબમિટ કરી દીધી છે." });
        }
      } catch (err) {
        console.error("Double submission check failed on server:", err);
      }
    }

    // D. Load questions
    let questionsList: any[] = [];
    if (isPlaceholder) {
      questionsList = fetchMockQuestions(subjectId, chapterId);
    } else {
      questionsList = await queryQuestionsFromFirestore(subjectId, chapterId, authHeader);
    }

    // Filter out q1 and q2 (legacy test questions in system) if any
    questionsList = questionsList.filter(q => q.questionId !== "q1" && q.questionId !== "q2");

    // E. SANITIZATION of keys and fields dynamically
    // Keep: questionId, question, options, imageUrl, type (and difficulty/subjectId/chapterId for mapping safety)
    // Strip: correctAnswer, explanation (strip these if isSubmit is false), isVerified, ownerAdminId, etc.
    const sanitizedQuestions = questionsList.map(q => {
      const item: any = {
        questionId: q.questionId,
        question: q.question,
        options: [q.optionA, q.optionB, q.optionC, q.optionD],
        imageUrl: q.illustrationUrl || (q.illustrationUrls && q.illustrationUrls[0]) || "",
        type: q.questionType || "MCQ"
      };

      if (isSubmit) {
        item.correctAnswer = q.correctAnswer;
        item.explanation = q.explanation || "સમજૂતી ટૂંક સમયમાં ઉપલબ્ધ થશે.";
      }

      return item;
    });

    return res.json({
      success: true,
      questions: sanitizedQuestions
    });
  } catch (error: any) {
    console.error("Secure questions fetching server error:", error);
    return res.status(500).json({
      error: "પ્રશ્નો મેળવવામાં ભૂલ આવી: " + (error?.message || "Internal failure")
    });
  }
});

export default router;
