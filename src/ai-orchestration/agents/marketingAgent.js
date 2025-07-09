// src/ai-orchestration/agents/marketingAgent.js
import { callVertexAI } from '../../api/vertexAiService';

/**
 * Marketingový agent pro generování obsahu.
 * @param {string} topic Téma pro marketingový obsah.
 * @returns {Promise<object>} Vygenerovaný marketingový obsah.
 */
export const generateLinkedInPost = async (topic) => {
    console.log(`Marketingový agent generuje LinkedIn příspěvek na téma: "${topic}"`);
    // Zde se skutečně zavolá Vertex AI s detailním promptem
    const aiResponse = await callVertexAI(`Vytvoř prodejní LinkedIn příspěvek o: ${topic}, zaměř se na výhody pro zákazníka.`);
    return aiResponse.data; // Vrací data jako generatedText, analysis atd.
};

// Můžete přidávat další marketingové funkce
export const generateCampaignIdea = async (product) => {
    const aiResponse = await callVertexAI(`Navrhni marketingovou kampaň pro produkt ${product}.`);
    return aiResponse.data;
};