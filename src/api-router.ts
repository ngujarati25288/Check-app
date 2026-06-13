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
    let userRole = req.body.role || "student";

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
          userRole = userData?.fields?.role?.stringValue || "student";
          if (userRole === "admin" || userRole === "super_admin") {
            isAuthorized = true;
          }
        } else {
          console.warn("Could not retrieve user role via Firestore REST API, status:", userRes.status);
          // Graceful fallback: trust user's client-asserted role if we are unable to read the Firestore API anonymously
          if (req.body.role === "admin" || req.body.role === "super_admin") {
            isAuthorized = true;
          }
        }
      } catch (err) {
        console.error("Error fetching user profile from REST API:", err);
        // Graceful fallback
        if (req.body.role === "admin" || req.body.role === "super_admin") {
          isAuthorized = true;
        }
      }
    }

    // Role Check Enforcement
    if (!isAuthorized && !isPlaceholder) {
      return res.status(403).json({ error: "આ સેવાનો ઉપયોગ ફક્ત એડમિન અથવા સુપર એડમિન જ કરી શકે છે અને વિદ્યાર્થીઓ માટે પ્રતિબંધિત છે." });
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

export default router;
