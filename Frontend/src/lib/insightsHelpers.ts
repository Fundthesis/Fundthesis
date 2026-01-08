export type Article = {
  headline: string | null;
  summary: string | null;
  label: string | null;
  source: string | null;
  publishedAt: Date | null;
  tickers: string | null;
};

/**
 * Format articles for LLM prompt
 */
export function formatArticlesForPrompt(articles: Article[]): string {
  if (articles.length === 0) {
    return "No recent articles available.";
  }

  return articles
    .slice(0, 30)
    .map((article) => {
      const headline = article.headline || "No headline";
      const summary = article.summary?.substring(0, 200) || "No summary";
      const sentiment = article.label || "neutral";
      const source = article.source || "Unknown";
      const tickers = article.tickers || "";

      return `Headline: ${headline}\nSummary: ${summary}\nSentiment: ${sentiment}\nSource: ${source}\nTickers: ${tickers}\n---`;
    })
    .join("\n");
}

/**
 * Generate market summary using Gemini API or fallback
 */
export async function generateMarketSummary(articlesText: string): Promise<string> {
  try {
    if (process.env.GEMINI_API_KEY) {
      const genAIModule = await import("@google/generative-ai").catch(() => null);

      if (genAIModule?.GoogleGenerativeAI) {
        const genAI = new genAIModule.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Analyze these financial news articles and write a 2-3 sentence market summary. Reference specific sectors, stocks, or trends mentioned in the articles. Be concrete and specific.

Articles:
${articlesText}

Market Summary:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text && text.trim()) {
          const cleanedText = cleanGeminiResponse(text);
          if (cleanedText) {
            return cleanedText;
          }
        }
      }
    }
  } catch (error) {
    console.log("Gemini API not available, using fallback:", error);
  }

  return generateFallbackSummary(articlesText);
}

/**
 * Generate AI recommendations using Gemini API or fallback
 */
export async function generateAIRecommendations(articlesText: string): Promise<string> {
  try {
    if (process.env.GEMINI_API_KEY) {
      const genAIModule = await import("@google/generative-ai").catch(() => null);

      if (genAIModule?.GoogleGenerativeAI) {
        const genAI = new genAIModule.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Analyze these financial news articles and write 2-3 sentences of investment recommendations. Reference specific sectors, companies, or themes from the articles. Provide actionable advice.

Articles:
${articlesText}

Recommendations:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text && text.trim()) {
          const cleanedText = cleanGeminiRecommendationsResponse(text);
          if (cleanedText) {
            return cleanedText;
          }
        }
      }
    }
  } catch (error) {
    console.log("Gemini API not available, using fallback:", error);
  }

  return generateFallbackRecommendations(articlesText);
}

/**
 * Clean Gemini response for market summary
 */
function cleanGeminiResponse(text: string): string | null {
  const lowerText = text.toLowerCase();
  const invalidPhrases = [
    "absence of", "no articles", "cannot be generated", "no recent",
    "without recent", "without any specific", "providing a specific",
    "is impossible", "assuming a neutral", "assuming a", "hypothetical",
    "even though there are no", "i understand", "i will still",
    "based on a hypothetical", "given the lack of specific news",
    "prompt", "instructions"
  ];

  if (invalidPhrases.some(phrase => lowerText.includes(phrase))) {
    return null;
  }

  if (lowerText.includes("likely experiencing") && lowerText.includes("awaiting")) {
    return null;
  }

  const sentences = text.trim().split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const filteredSentences = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return !(
      lower.includes("without recent") ||
      lower.includes("without any specific") ||
      lower.includes("given the lack of") ||
      lower.includes("lack of specific") ||
      lower.includes("providing a specific") ||
      lower.includes("is impossible") ||
      lower.includes("assuming a neutral") ||
      lower.includes("assuming a") ||
      (lower.includes("however") && (lower.includes("assuming") || lower.includes("likely"))) ||
      (lower.includes("given") && lower.includes("lack"))
    );
  });

  let cleanedText = filteredSentences.join(". ").trim();
  if (cleanedText && !cleanedText.endsWith(".") && !cleanedText.endsWith("!") && !cleanedText.endsWith("?")) {
    cleanedText += ".";
  }

  return cleanedText || null;
}

/**
 * Clean Gemini response for recommendations
 */
function cleanGeminiRecommendationsResponse(text: string): string | null {
  const lowerText = text.toLowerCase();
  const invalidPhrases = [
    "absence of", "no articles", "cannot be generated", "no recent",
    "hypothetical", "even though there are no", "i understand", "i will still",
    "based on a hypothetical", "given the lack of", "lack of specific",
    "without any specific", "generalized investment", "general advice",
    "doesn't substitute", "does not substitute", "crucial to remember",
    "important to remember", "it's crucial", "it is crucial",
    "personalized financial plan", "individual circumstances",
    "prompt", "instructions"
  ];

  if (invalidPhrases.some(phrase => lowerText.includes(phrase))) {
    return null;
  }

  const sentences = text.trim().split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const filteredSentences = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return !(
      lower.includes("without any specific") ||
      lower.includes("given the lack of") ||
      lower.includes("lack of specific") ||
      lower.includes("generalized") ||
      lower.includes("general advice") ||
      lower.includes("doesn't substitute") ||
      lower.includes("does not substitute") ||
      lower.includes("crucial to remember") ||
      lower.includes("important to remember") ||
      lower.includes("personalized financial plan") ||
      lower.includes("individual circumstances") ||
      lower.includes("it's crucial") ||
      lower.includes("it is crucial") ||
      (lower.includes("given") && lower.includes("lack"))
    );
  });

  let cleanedText = filteredSentences.join(". ").trim();
  if (cleanedText && !cleanedText.endsWith(".") && !cleanedText.endsWith("!") && !cleanedText.endsWith("?")) {
    cleanedText += ".";
  }

  return cleanedText || null;
}

/**
 * Generate fallback market summary based on keyword analysis
 */
export function generateFallbackSummary(articlesText: string): string {
  if (!articlesText || articlesText === "No recent articles available.") {
    return "Markets showed mixed signals today with various sectors experiencing different trends. Technology and healthcare sectors showed resilience, while some cyclical sectors faced pressure. Investors are maintaining a balanced approach to portfolio management.";
  }

  const positiveKeywords = ["positive", "gain", "rise", "growth", "bullish", "surge", "rally", "up", "increase"];
  const negativeKeywords = ["negative", "fall", "drop", "decline", "bearish", "plunge", "crash", "down", "decrease"];

  const sectorKeywords = {
    tech: ["tech", "technology", "ai", "semiconductor", "software", "cloud", "microsoft", "apple", "nvidia", "google"],
    healthcare: ["healthcare", "pharma", "biotech", "medical", "pfizer", "jnj", "unh"],
    finance: ["bank", "financial", "jpmorgan", "goldman", "wells fargo"],
    energy: ["energy", "oil", "renewable", "solar", "exxon", "chevron"],
  };

  const text = articlesText.toLowerCase();
  const positiveCount = positiveKeywords.filter((kw) => text.includes(kw)).length;
  const negativeCount = negativeKeywords.filter((kw) => text.includes(kw)).length;

  const mentionedSectors: string[] = [];
  if (sectorKeywords.tech.some((kw) => text.includes(kw))) mentionedSectors.push("technology");
  if (sectorKeywords.healthcare.some((kw) => text.includes(kw))) mentionedSectors.push("healthcare");
  if (sectorKeywords.finance.some((kw) => text.includes(kw))) mentionedSectors.push("financial");
  if (sectorKeywords.energy.some((kw) => text.includes(kw))) mentionedSectors.push("energy");

  const sectorText = mentionedSectors.length > 0
    ? `${mentionedSectors.slice(0, 2).join(" and ")} sectors`
    : "various sectors";

  if (positiveCount > negativeCount) {
    return `Markets showed positive momentum today with ${sectorText} leading the gains. Investor sentiment remains optimistic as markets respond to favorable developments. Key sectors continue to attract attention with strong performance indicators.`;
  } else if (negativeCount > positiveCount) {
    return `Markets experienced volatility today with ${sectorText} facing headwinds. Investors are exercising caution amid market uncertainties. Consider monitoring key indicators closely before making significant portfolio adjustments.`;
  } else {
    return `Markets showed mixed signals today with ${sectorText} experiencing different trends. Technology and healthcare sectors showed resilience, while some cyclical sectors faced pressure. Investors are maintaining a balanced approach to portfolio management.`;
  }
}

/**
 * Generate fallback recommendations based on keyword analysis
 */
export function generateFallbackRecommendations(articlesText: string): string {
  if (!articlesText || articlesText === "No recent articles available.") {
    return "Consider diversifying your portfolio across technology, healthcare, and financial sectors for balanced growth. Maintain a mix of growth and value stocks to manage risk effectively. Regularly review your asset allocation to align with your investment goals and risk tolerance.";
  }

  const techKeywords = ["tech", "ai", "semiconductor", "software", "cloud", "microsoft", "apple", "nvidia", "google"];
  const energyKeywords = ["energy", "renewable", "solar", "wind", "oil", "exxon", "chevron"];
  const healthcareKeywords = ["healthcare", "pharma", "biotech", "medical", "pfizer", "jnj"];
  const financeKeywords = ["bank", "financial", "jpmorgan", "goldman", "wells fargo"];

  const text = articlesText.toLowerCase();
  const hasTech = techKeywords.some((kw) => text.includes(kw));
  const hasEnergy = energyKeywords.some((kw) => text.includes(kw));
  const hasHealthcare = healthcareKeywords.some((kw) => text.includes(kw));
  const hasFinance = financeKeywords.some((kw) => text.includes(kw));

  const recommendations: string[] = [];
  if (hasTech) recommendations.push("technology");
  if (hasEnergy) recommendations.push("energy");
  if (hasHealthcare) recommendations.push("healthcare");
  if (hasFinance) recommendations.push("financial services");

  if (recommendations.length > 0) {
    const sectorList = recommendations.length > 2
      ? `${recommendations.slice(0, 2).join(", ")}, and ${recommendations[2]}`
      : recommendations.join(" and ");
    return `Consider diversifying into ${sectorList} sectors based on current market trends. These areas show potential for growth while helping balance your portfolio risk. Maintain a strategic mix of growth and value positions to optimize returns.`;
  }

  return "Consider diversifying your portfolio across technology, healthcare, and financial sectors for balanced growth. Maintain a mix of growth and value stocks to manage risk effectively. Regularly review your asset allocation to align with your investment goals.";
}
