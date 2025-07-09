// src/ai-orchestration/chytrJA.js
import { callVertexAI } from '../api/vertexAiService';
import { generateLinkedInPost } from './agents/marketingAgent';
// Můžete přidávat další agenty, jakmile je vytvoříte

/**
 * Hlavní dirigent AI. Interpretuje uživatelský dotaz a orchestruje odpověď.
 * @param {string} userQuery Dotaz od uživatele.
 * @returns {Promise<object>} Odpověď pro uživatele.
 */
export const processUserQuery = async (userQuery) => {
    try {
        // Krok 1: AI interpretace dotazu (dříve fuzzy logika)
        // Zde by skutečná AI (Vertex AI) analyzovala dotaz a určila záměr
        // Pro simulaci budeme provizorně reagovat na klíčová slova
        const aiAnalysis = await callVertexAI(`Analyzuj uživatelský dotaz a doporuč akci: "${userQuery}"`);

        let response = { type: 'text', content: 'Pracuji na tom...' };

        // Krok 2: Orchestrace - rozhodnutí, kterého agenta použít
        if (userQuery.toLowerCase().includes('linkedin')) {
            // Použijeme marketingAgenta pro LinkedIn příspěvek
            const linkedInResponse = await generateLinkedInPost(userQuery);
            response = { type: 'text', content: `Generuji LinkedIn příspěvek: ${linkedInResponse.generatedText}` };
        } else if (userQuery.toLowerCase().includes('výroba')) {
            // Zde by se volal productionAgent
            const productionResponse = await callVertexAI(`Vytvoř výrobní plán pro: ${userQuery}`, { context: 'výroba' });
            response = { type: 'text', content: `AI navrhuje výrobní plán: ${productionResponse.data.plan}` };
        } else if (userQuery.toLowerCase().includes('finance')) {
            // Zde by se volal financeAgent
            const financeResponse = await callVertexAI(`Proveď finanční analýzu pro: ${userQuery}`, { context: 'finance' });
            response = { type: 'text', content: `AI finanční analýza: ${financeResponse.data.report}. Doporučení: ${financeResponse.data.recommendations.join(', ')}` };
        } else {
            // Obecná odpověď od AI
            const genericResponse = await callVertexAI(userQuery);
            response = { type: 'text', content: genericResponse.data.response };
        }

        return response;

    } catch (error) {
        console.error("Chyba v AI orchestraci:", error);
        return { type: 'error', content: 'Došlo k chybě při zpracování vašeho požadavku. Zkuste to prosím znovu.' };
    }
};