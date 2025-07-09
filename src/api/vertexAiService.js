// src/api/vertexAiService.js

// Důležité: TOTO JE POUZE SIMULACE!
// Skutečné volání Vertex AI bude vyžadovat API klíče a nastavení backendu/proxy
// pro bezpečné volání z frontendové aplikace.

/**
 * Simuluje volání Vertex AI pro zpracování uživatelského dotazu.
 * @param {string} prompt Textový vstup pro AI.
 * @param {object} [options={}] Další volby pro AI model (např. model, teplota, kontext).
 * @returns {Promise<object>} Simulovaná odpověď od AI.
 */
export const callVertexAI = async (prompt, options = {}) => {
  console.log(`Simuluji volání Vertex AI s promptem: "${prompt}" a options:`, options);

  // Zpoždění pro simulaci asynchronního volání
  await new Promise(resolve => setTimeout(Math.random() * 1000 + 500, resolve)); // 0.5s to 1.5s delay

  // Jednoduchá logika pro simulaci odpovědí na základě promptu
  if (prompt.toLowerCase().includes('linkedin')) {
    return {
      status: 'success',
      data: {
        generatedText: `Tady je personalizovaný LinkedIn příspěvek pro vás na téma: "${prompt.slice(0, 50)}...". Váš prodejní text bude inspirovaný AI! #LinkedIn #AI`,
        analysis: 'Analyzováno jako marketingový požadavek.'
      }
    };
  } else if (prompt.toLowerCase().includes('výroba')) {
    return {
      status: 'success',
      data: {
        plan: `Simulovaný výrobní plán pro požadavek: "${prompt.slice(0, 50)}...". Optimalizováno AI pro kusovou výrobu!`,
        efficiency: 'Předpokládané zlepšení efektivity o 15%.'
      }
    };
  } else if (prompt.toLowerCase().includes('finance')) {
    return {
      status: 'success',
      data: {
        report: `Simulovaná finanční zpráva pro dotaz: "${prompt.slice(0, 50)}...". Analyzováno AI pro úsporná opatření.`,
        recommendations: ['Snížit provozní náklady', 'Optimalizovat cash flow']
      }
    };
  } else if (prompt.toLowerCase().includes('marketing')) {
    return {
      status: 'success',
      data: {
        campaignIdea: `Simulovaný nápad na marketingovou kampaň k: "${prompt.slice(0, 50)}...". Cílení na segment Z.`,
        targetAudience: 'Mladí profesionálové.'
      }
    };
  } else {
    return {
      status: 'success',
      data: {
        response: `Rozumím vašemu dotazu: "${prompt.slice(0, 50)}...". Chytré Já prozatím simuluje odpověď. Brzy bude plně funkční!`,
        action: 'default_response'
      }
    };
  }
};