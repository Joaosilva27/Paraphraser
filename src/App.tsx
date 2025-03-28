import { useEffect, useState, useMemo } from "react";
import "./App.css";
import { GoogleGenerativeAI } from "@google/generative-ai";
import GithubIcon from "./images/github.png";
import { CounterAPI } from "counterapi";
import QuillNotIcon from "./images/QuillNotIcon.png";

function App() {
  const genAI = new GoogleGenerativeAI(
    "AIzaSyAThR2xsb5E_ra5OfeWhqsBy3wiJZch-so"
  );
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const [savedOutput, setSavedOutput] = useState(
    localStorage.getItem("output") || ""
  );
  const [savedInput, setSavedInput] = useState(
    localStorage.getItem("input") || ""
  );
  const [prompt, setPrompt] = useState(savedInput);
  const [promptResult, setPromptResult] = useState(savedOutput);
  const [isLoading, setIsLoading] = useState(false);
  const [standardStyle] = useState(
    "natural without changing the original meaning"
  );
  const [academicStyle] = useState(
    "Academic, meaning you must express the text in a more technical and scholarly way."
  );
  const [fluentStyle] = useState(
    "Fluent, meaning you must improve the clarity and readability of the text."
  );
  const [humanizeStyle] = useState(
    "Human, meaning you must re-write the text in a more human, authentic way."
  );
  const [formalStyle] = useState(
    "Formal, meaning you must sound more sophisticated."
  );
  const [expandStyle] = useState(
    "Extended, meaning you must rephrase this text using a higher word count while maintaining its meaning and not making a lot of changes."
  );
  const [shortStyle] = useState(
    "Shortened, meaning you must rephrase this text using a lower word count while maintaining its meaning and not making a lot of changes."
  );
  const [selectedStyle, setSelectedStyle] = useState(standardStyle);
  const [fewerChanges] = useState(
    "EXTREMELY STRICT MODE: Preserve 98-100% of the original text. " +
      "ONLY change 1-3 words per sentence MAXIMUM, and only when: " +
      "1) There's a clear grammatical error, OR " +
      "2) A word is extremely obscure/confusing, OR " +
      "3) A direct synonym exists that is clearly better " +
      "NEVER change: " +
      "- Proper nouns, names, technical terms " +
      "- Sentence structure or word order " +
      "- Phrases or idioms (treat as single units) " +
      "- The tone or formality level " +
      "When substituting words: " +
      "- Only use the most common synonyms " +
      "- Never change more than one word per clause " +
      "- Preserve all prefixes/suffixes " +
      "Prioritize keeping the text IDENTICAL over any 'improvements'"
  );
  const [standardChanges] = useState("");
  const [moreChanges] = useState(
    "IMPORTANT: You will make a lot of changes to the original text; Make as many changes as possible."
  );
  const [selectedChanges, setSelectedChanges] = useState(fewerChanges);
  const [changesLevel, setChangesLevel] = useState(0);
  const [customDescription, setCustomDescription] = useState("");
  const counterAPI = new CounterAPI();
  const [count, setCount] = useState(0);
  const [clickedWord, setClickedWord] = useState<{
    word: string;
    position: { x: number; y: number };
    wordIndex: number;
    paragraphIndex: number;
    wordInParagraph: number;
    sentenceIndex: number;
  } | null>(null);
  const [clickedWordSynonyms, setClickedWordSynonyms] = useState("");
  const [clickedRephraseSentence, setClickedRephraseSentence] = useState(false);
  const [sentenceRephrases, setSentenceRephrases] = useState<string[]>([]);
  const [isSentenceLoading, setIsSentenceLoading] = useState(false);

  const getWordCount = (text: string) =>
    text.trim() ? text.trim().split(/\s+/).length : 0;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPrompt(text);
      setSavedInput(text);
    } catch (error) {
      console.error("Failed to paste text:", error);
    }
  };

  useEffect(() => {
    if (changesLevel === 0) setSelectedChanges(fewerChanges);
    else if (changesLevel === 1) setSelectedChanges(standardChanges);
    else setSelectedChanges(moreChanges);
  }, [changesLevel]);

  const onParaphrase = () => {
    const getParaphrasingData = async () => {
      if (!prompt.trim()) return;
      try {
        setIsLoading(true);
        const promptInstructions = `You are an expert paraphrasing tool. Your task is to rewrite the provided text while strictly maintaining:
1. The original meaning and intent
2. The same language as the input
3. The same sentence types
4. The original technicality and complexity level

Key requirements:
- Preserve 100% of the original meaning
- Maintain the original paragraph structure
- Keep specialized terminology unchanged
- Retain all proper nouns and technical terms
- Only change wording when it improves clarity without altering meaning

Style guidance: ${
          selectedStyle || "natural without changing the original meaning"
        }

Change level: ${selectedChanges}

Input text to paraphrase: ${prompt}

Provide your paraphrased version:`;
        const result = await model.generateContent(promptInstructions);
        const responseText = result.response.text();
        const processedText = responseText
          .replace(/(\n){3,}/g, "\n\n")
          .replace(/(\S)\n(\S)/g, "$1 $2")
          .trim();
        setPromptResult(processedText);
        setSavedOutput(processedText);
        localStorage.setItem("output", processedText);
        counterAPI
          .up("quillnot", "paraphrases")
          .then((res) => setCount(res.Count));
      } catch (err) {
        setPromptResult("An error occurred. Please try again." + err);
      } finally {
        setIsLoading(false);
      }
    };
    getParaphrasingData();
  };

  const clearAll = () => {
    setPrompt("");
    setPromptResult("");
    localStorage.removeItem("output");
    setSavedOutput("");
    localStorage.removeItem("input");
    setSavedInput("");
  };

  const selectStyle = (style: string) => setSelectedStyle(style);

  useEffect(() => {
    if (prompt.length > 0) {
      localStorage.setItem("input", prompt);
      setSavedInput(prompt);
    }
  }, [prompt]);

  useEffect(() => {
    counterAPI
      .get("quillnot", "paraphrases")
      .then((res) => setCount(res.Count));
  }, []);

  const getOriginalWord = (word: string) => word.replace(/^\W+/g, "");

  const cleanedOriginalWords = useMemo(() => {
    const words = prompt.trim().split(/\s+/);
    return new Set(words.map((word) => getOriginalWord(word)));
  }, [prompt]);

  const onClickedWord = (word: string) => {
    setClickedWordSynonyms("Loading...");
    const fetchSynonymData = async () => {
      try {
        const originalWord = getOriginalWord(word);
        const promptInstructions = `Provide 6 synonyms for "${originalWord}" separated by commas.
        The synonyms must have the same case as the word provided.
        IMPORTANT: - ONLY SYNONYMS, NO EXTRA TEXT`;
        const result = await model.generateContent(promptInstructions);
        const responseText = result.response.text();
        const matchCase = (original: string, synonym: string) => {
          if (original === original.toUpperCase()) return synonym.toUpperCase();
          else if (original === original.toLowerCase())
            return synonym.toLowerCase();
          else if (/^[A-Z]/.test(original))
            return (
              synonym.charAt(0).toUpperCase() + synonym.slice(1).toLowerCase()
            );
          return synonym;
        };
        const cleanedSynonyms = responseText
          .replace(/["\\*]/g, "")
          .split(",")
          .slice(0, 6)
          .map((s) => matchCase(originalWord, s.trim()))
          .join(", ");
        setClickedWordSynonyms(cleanedSynonyms);
      } catch (err) {
        setClickedWordSynonyms("Failed to load synonyms");
        console.log(err);
      }
    };
    fetchSynonymData();
  };

  const replaceWordWithSynonym = (_originalWord: string, synonym: string) => {
    if (!clickedWord) return;
    const paragraphs = promptResult.split("\n\n");
    const targetParagraph = paragraphs[clickedWord.paragraphIndex];
    const sentences = targetParagraph.split(/(?<=\.)\s+/);
    const targetSentence = sentences[clickedWord.sentenceIndex];
    const words = targetSentence.split(/\s+/);
    if (
      words[clickedWord.wordInParagraph] &&
      getOriginalWord(words[clickedWord.wordInParagraph]) === clickedWord.word
    ) {
      const originalWord = words[clickedWord.wordInParagraph];
      const punctuationMatch = originalWord.match(/[.,!?;:]+$/);
      const punctuation = punctuationMatch ? punctuationMatch[0] : "";
      words[clickedWord.wordInParagraph] = synonym + punctuation;
      sentences[clickedWord.sentenceIndex] = words.join(" ");
      paragraphs[clickedWord.paragraphIndex] = sentences.join(" ");
      const newText = paragraphs.join("\n\n");
      setPromptResult(newText);
      setSavedOutput(newText);
      localStorage.setItem("output", newText);
    }
    setClickedWord(null);
  };

  const getCurrentSentence = () => {
    if (!clickedWord) return null;
    const paragraphs = promptResult.split("\n\n");
    if (paragraphs.length <= clickedWord.paragraphIndex) return null;
    const sentences =
      paragraphs[clickedWord.paragraphIndex].split(/(?<=\.)\s+/);
    if (sentences.length <= clickedWord.sentenceIndex) return null;
    return sentences[clickedWord.sentenceIndex].trim();
  };

  const fetchSentenceRephrases = async (sentence: string) => {
    try {
      setIsSentenceLoading(true);
      const instruction = `Provide 6 different rephrases of this sentence while:
        - Keeping the exact same meaning
        - Maintaining all names, numbers, and technical terms
        - Following style: ${selectedStyle}
        - Changing no more than 3 words per rephrase
        - IMPORTANT: Return ONLY a numbered list of rephrases, DO NOT, I REPEAT DO NOT INCLUDE ANYTHING ELSE, ONLY THE REPHRASES. (1st phrase. ... 2nd phrase. ... etc.)
        
        Sentence: "${sentence}"`;

      const result = await model.generateContent(instruction);
      const responseText = result.response.text();

      const rephrases = responseText
        .split("\n")
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 6);

      setSentenceRephrases(rephrases);
    } catch (err) {
      console.error("Failed to generate rephrases:", err);
      setSentenceRephrases([]);
    } finally {
      setIsSentenceLoading(false);
    }
  };

  const replaceSentence = (newSentence: string) => {
    if (!clickedWord) return;
    const paragraphs = [...promptResult.split("\n\n")];
    const sentences =
      paragraphs[clickedWord.paragraphIndex].split(/(?<=\.)\s+/);
    sentences[clickedWord.sentenceIndex] = newSentence;
    paragraphs[clickedWord.paragraphIndex] = sentences.join(" ");
    const newText = paragraphs.join("\n\n");
    setPromptResult(newText);
    setSavedOutput(newText);
    localStorage.setItem("output", newText);
    setClickedWord(null);
  };

  useEffect(() => {
    if (clickedRephraseSentence && clickedWord) {
      const sentence = getCurrentSentence();
      if (sentence) {
        fetchSentenceRephrases(sentence);
      }
    }
  }, [clickedRephraseSentence]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="bg-[#7A9E7E] text-white py-3 px-4 md:px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <span className="flex justify-center items-center">
            <img
              src={QuillNotIcon}
              className="h-8 w-8 object-contain bg-white rounded-3xl"
            />
            <h1 className="text-3xl font-bold dancing-script-400">QuillNot</h1>
          </span>
          <span className="capitalize font-medium text-[#7A9E7E] bg-[#E8F5E9] px-2 py-1 rounded-md border border-[#7A9E7E]/20 transition-colors animate-pulse-once text-sm sm:text-base text-center">
            {count} total paraphrases across all users
          </span>
          <a
            className="text-[#E8F5E9] hover:text-white text-sm underline flex justify-center items-center"
            href="https://www.joaoportfolio.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            by João Silva
            <img
              src={GithubIcon}
              className="h-4 w-4 ml-1.5 animate-bounce object-contain"
            />
          </a>
        </div>
      </header>

      <main className="flex-1 xl:min-w-7xl max-w-7xl mx-auto p-2 sm:p-3 flex flex-col overflow-hidden">
        <div className="bg-white rounded-t-lg shadow-sm border border-gray-200 p-2 sm:p-3">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-2">
            <button
              onClick={onParaphrase}
              disabled={isLoading || !prompt.trim()}
              className={`px-3 sm:px-6 py-2 rounded font-medium text-white ${
                isLoading || !prompt.trim()
                  ? "bg-gray-400"
                  : "bg-[#7A9E7E] hover:bg-[#6B8E71]"
              } transition-colors flex items-center`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8极简V0C5.373 0 0 5.373 极简0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Paraphrase"
              )}
            </button>

            <button
              onClick={clearAll}
              className="px-3 sm:px-6 py-2 text-black rounded font-medium border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:flex-wrap items-start md:items-center justify-between gap-2">
            <div className="flex-1 w-full md:w-auto">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Select Paraphrasing Style:
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => setSelectedStyle(standardStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === standardStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Standard
                </button>
                <button
                  onClick={() => selectStyle(academicStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === academicStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Academic
                </button>
                <button
                  onClick={() => selectStyle(fluentStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === fluentStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Fluent
                </button>
                <button
                  onClick={() => selectStyle(humanizeStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === humanizeStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Human
                </button>
                <button
                  onClick={() => selectStyle(formalStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === formalStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Formal
                </button>
                <button
                  onClick={() => selectStyle(expandStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === expandStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Extended
                </button>
                <button
                  onClick={() => selectStyle(shortStyle)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedStyle === shortStyle
                      ? "bg-[#7A9E7E] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  Shortened
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectStyle(customDescription)}
                    className={`px极简2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                      selectedStyle === customDescription
                        ? "bg-[#7A9E7E] text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    } transition-colors`}
                  >
                    Custom
                  </button>
                  {selectedStyle === customDescription && (
                    <input
                      type="text"
                      value={customDescription}
                      onChange={(e) => {
                        const newDesc = e.target.value;
                        setCustomDescription(newDesc);
                        setSelectedStyle(newDesc);
                      }}
                      placeholder="Describe style..."
                      className="px-2 py-1 text-xs text-black sm:text-sm border-[#7A9E7E] border-2 rounded focus:outline-none focus:ring-2 focus:ring-[#7A9E7E] w-32 sm:w-48"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center flex-col gap-2 w-full md:w-auto md:ml-2 lg:mr-10 mt-2 md:mt-0">
              <p className="极简text-sm font-medium text-gray-700 whitespace-nowrap">
                Amount of Changes:
              </p>
              <div className="w-full sm:w-48 relative">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={changesLevel}
                  onChange={(e) => setChangesLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer custom-slider"
                />
                <div className="absolute w-full flex justify-between px-1.5 top-3.5 pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full pointer-events-none ${
                        changesLevel >= i ? "bg-[#7A9E7E]" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between w-full text-xs text-gray-600 mt-4">
                  <span
                    className={
                      changesLevel === 0 ? "font-semibold text-[#7A9E7E]" : ""
                    }
                  >
                    Fewer
                  </span>
                  <span
                    className={
                      changesLevel === 1 ? "font-semibold text-[#7A9E7E]" : ""
                    }
                  >
                    Standard
                  </span>
                  <span
                    className={
                      changesLevel === 2 ? "font-semibold text-[#7A9E7E]" : ""
                    }
                  >
                    More
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedStyle && (
            <div className="mt-1 text-xs sm:text-sm text-gray-600 italic">
              {selectedStyle === standardStyle &&
                "Standard - Maintains your original meaning with natural-sounding variations."}
              {selectedStyle === academicStyle &&
                "Academic - Transforms your text into a more technical and scholarly tone with formal vocabulary and structure."}
              {selectedStyle === fluentStyle &&
                "Fluent - Enhances the clarity and flow of your text while maintaining your original message."}
              {selectedStyle === humanizeStyle &&
                "Human - Makes your text sound more natural and conversational, as if written by a person."}
              {selectedStyle === formalStyle &&
                "Formal - Elevates your text with sophisticated language and proper structure without being overly technical."}
              {selectedStyle === expandStyle &&
                "Extended - Elaborates on your original text with additional details and explanations."}
              {selectedStyle === shortStyle &&
                "Shortened - Condenses your text while preserving the key points and meaning."}
              {selectedStyle === customDescription && (
                <span className="block w-full md:truncate md:max-w-xl break-words">{`Custom - Your text will be rewritten to sound: "${customDescription}".`}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col md:flex-row border-x border-b border-gray-200 bg-white rounded-b-lg shadow-sm overflow-hidden">
          <div className="flex-1 md:border-r border-b md:border-b-0 border-gray-200 flex flex-col">
            <div className="p-2 flex items-center bg-gray极简-50 border-b border-gray-200">
              <h2 className="font-medium text-gray-700 text-sm sm:text-base">
                Original Text
              </h2>
              <div className="ml-auto text-xs text-gray-500">
                {getWordCount(prompt)} words / {prompt.length} characters (
                {prompt.replace(/\s/g, "").length} without spaces)
              </div>
            </div>
            <div className="relative flex-1 min-h-60 md:min-h-0">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full text-black text-lg h-full p-2 sm:p-3 focus:outline-none resize-none"
                placeholder={"Enter your text here to paraphrase..."}
              />
              {!prompt && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={handlePaste}
                    className="flex items-center gap-2 px-3 sm:px-极简4 py-2 bg-[#7A9E7E] text-white rounded hover:bg-[#6B8E71] transition-colors pointer-events-auto text-sm sm:text-base"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 sm:h-5 w-4 sm:w-5"
                      fill="none"
                      viewBox="极简0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Paste Text
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-medium text-gray-700 text-sm sm:text-base">
                Paraphrased Text
              </h2>
              <div className="flex items-center flex-wrap justify-end">
                {promptResult && (
                  <div className="text-xs text-gray-500 mr-2">
                    {getWordCount(promptResult)} words / {promptResult.length}{" "}
                    <span className="hidden sm:inline">characters</span>
                    <span className="inline sm:hidden">chars</span> (
                    {promptResult.replace(/\s/g, "").length}{" "}
                    <span className="hidden sm:inline">without spaces</span>
                    <span className="inline sm:hidden">no spaces</span>)
                  </div>
                )}
                {promptResult && (
                  <button
                    onClick={() => navigator.clipboard.writeText(promptResult)}
                    className="text-sm text-[#7A9E7E] hover:text-[#6B8E71] flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 极简2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2极简h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                    Copy
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 p-2 sm:p-3 overflow-y-auto bg-white min-h-60 md:min-h-0 max-h-[calc(50vh)] xs:max-w-[calc(80vw)] md:max-w-[calc(40vw)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg
                      className="animate-spin h-6 sm:h-8 w-6 sm:w-8 mx-auto mb-3 sm:mb-4 text-[#7A9E7E]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12极简h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating paraphrase...
                  </div>
                </div>
              ) : promptResult ? (
                <div className="prose text-lg text-black prose-sm max-w-none whitespace-pre-line">
                  {promptResult.split("\n\n").map((paragraph, pIndex) => (
                    <div key={pIndex} className="mb-4">
                      {paragraph.split(/(?<=\.)\s+/).map((sentence, sIndex) => {
                        const sentenceText = sentence.endsWith(".")
                          ? sentence.trim()
                          : `${sentence.trim()}`;
                        return (
                          <span
                            key={sIndex}
                            className="bg-blue-50 rounded-[3px] mx-[1px] px-[3px] m-0.5 mr-1 border border-gray-100/50 hover:bg-red-50 inline leading-[1.8]"
                          >
                            {sentenceText
                              .split(/\s+/)
                              .map((word, wordIndex) => {
                                let globalWordIndex = 0;
                                for (let i = 0; i < pIndex; i++) {
                                  globalWordIndex += promptResult
                                    .split("\n\n")
                                    [i].split(/\s+/).length;
                                }
                                const currentParagraph =
                                  promptResult.split("\n\n")[pIndex];
                                const sentences =
                                  currentParagraph.split(/(?<=\.)\s+/);
                                for (let i = 0; i < sIndex; i++) {
                                  globalWordIndex +=
                                    sentences[i].split(/\s+/).length;
                                }
                                globalWordIndex += wordIndex;
                                const originalWord = getOriginalWord(word);
                                const isDifferent =
                                  !cleanedOriginalWords.has(originalWord);
                                return (
                                  <span
                                    key={wordIndex}
                                    className={
                                      prompt && isDifferent
                                        ? "text-blue-500 cursor-pointer"
                                        : "cursor-pointer"
                                    }
                                    onClick={(e) => {
                                      if (!prompt) return;
                                      setClickedWord({
                                        word: originalWord,
                                        position: {
                                          x: e.clientX,
                                          y: e.clientY,
                                        },
                                        wordIndex: globalWordIndex,
                                        paragraphIndex: pIndex,
                                        wordInParagraph: wordIndex,
                                        sentenceIndex: sIndex,
                                      });
                                      onClickedWord(originalWord);
                                    }}
                                  >
                                    {word}{" "}
                                  </span>
                                );
                              })}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-center text-sm sm:text-base">
                  Your paraphrased text will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <div className="max-w-7xl mx-auto pb-1">
        <span className="text-xs font-medium text-gray-500 block text-center">
          I can process very long texts, even tens of thousands of words — but
          extremely lengthy inputs may reduce the quality of my response because
          I might lose focus. There's no official word limit.
        </span>
      </div>
      {clickedWord && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setClickedWord(null);
              setClickedRephraseSentence(false);
            }}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50"
            style={{
              // Calculate max available space
              maxWidth: "min(90vw, 500px)",
              width: "auto",
              maxHeight: "min(90vh, 500px)",
              // Dynamic positioning that stays in viewport
              top: `${
                clickedWord.position.y > window.innerHeight / 2
                  ? Math.max(10, clickedWord.position.y - 300) // Position above if near bottom
                  : clickedWord.position.y + 20 // Position below if near top
              }px`,
              left: `${
                clickedWord.position.x > window.innerWidth / 2
                  ? Math.max(10, clickedWord.position.x - 300) // Position left if near right edge
                  : Math.min(
                      window.innerWidth - 320,
                      clickedWord.position.x + 20
                    ) // Position right if near left edge
              }px`,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <div className="p-3">
              {clickedRephraseSentence ? (
                <div
                  className="flex flex-col gap-3"
                  style={{ minWidth: "300px" }}
                >
                  <div className="text-sm font-medium text-gray-700">
                    <span className="font-semibold text-[#7A9E7E]">
                      Original:
                    </span>
                    <div className="italic mt-1 whitespace-normal break-words max-w-full">
                      {getCurrentSentence()}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    <span className="font-semibold text-[#7A9E7E]">
                      Rephrased options:
                    </span>
                    {isSentenceLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <svg
                          className="animate-spin h-4 w-4 mr-2 text-[#7A9E7E]"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Generating rephrases...
                      </div>
                    ) : sentenceRephrases.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {sentenceRephrases.map((rephrase, index) => (
                          <div
                            key={index}
                            className="p-2 bg-gray-100 hover:bg-[#7A9E7E] hover:text-white rounded cursor-pointer transition-colors whitespace-normal break-words"
                            onClick={() => {
                              replaceSentence(rephrase);
                              setClickedRephraseSentence(false);
                            }}
                          >
                            {rephrase}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-red-500 text-xs py-1">
                        Failed to generate rephrases
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setClickedRephraseSentence(false)}
                    className="text-[#7A9E7E] hover:text-[极简#6B8E71] text-sm underline self-start"
                  >
                    ← Back to synonyms
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    <span className="font-semibold text-[#7A9E7E]">
                      {clickedWord.word}{" "}
                      <span className="text-black">synonyms:</span>
                    </span>
                    <button
                      onClick={() => setClickedRephraseSentence(true)}
                      className="float-right bg-[#7A9E7E] hover:bg-[#6B8E71] text-xs p-1 rounded text-white"
                    >
                      Rephrase Sentence
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {clickedWordSynonyms === "Loading..." ? (
                      <div className="flex items-center justify-center w-full py-2">
                        <svg
                          className="animate-spin h-4 w-4 mr-2 text-[#7A9E7E]"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.极简962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </div>
                    ) : clickedWordSynonyms === "Failed to load synonyms" ? (
                      <div className="text-red-500 text-xs py-1">
                        Failed to load synonyms
                      </div>
                    ) : (
                      clickedWordSynonyms.split(", ").map((synonym, index) => (
                        <button
                          key={index}
                          className="px-2.5 py-1 text-sm bg-gray-100 hover:bg-[#7A9E7E] hover:text-white rounded-full transition-colors"
                          onClick={() => {
                            replaceWordWithSynonym(clickedWord.word, synonym);
                            setClickedWord(null);
                          }}
                        >
                          {synonym}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
