// src/ai-orchestration/agents/commandAgent.js
import { fetchSheetData } from '../../api/googleSheets';
// Importujeme ID tabulky a nově i název listu a rozsah pro povely z config.js
import {
    GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_SHEETS_COMMANDS_LIST_NAME,
    GOOGLE_SHEETS_COMMANDS_RANGE
} from '../../api/config';

/**
 * Vyhledá uživatelský povel v Google Sheet tabulce Commands.
 * @param {string} userQuery Textový povel od uživatele.
 * @returns {Promise<object|null>} Objekt s response_type a response_data, nebo null pokud povel nenalezen.
 */
export const findCommand = async (userQuery) => {
    console.log(`🔎 Hledám povel "${userQuery}" v Google Sheets Commands...`);
    // Používáme GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_COMMANDS_LIST_NAME a GOOGLE_SHEETS_COMMANDS_RANGE z config.js.
    const range = `${GOOGLE_SHEETS_COMMANDS_LIST_NAME}!${GOOGLE_SHEETS_COMMANDS_RANGE}`;

    try {
        const sheetData = await fetchSheetData(GOOGLE_SHEETS_SPREADSHEET_ID, range);
        if (!sheetData || !sheetData.values) {
            console.log("❌ Žádná data z Google Sheets Commands.");
            return null;
        }

        const headers = sheetData.values[0]; // Předpokládáme, že první řádek jsou hlavičky
        const commandIndex = headers.indexOf('Povel');
        const responseTypeIndex = headers.indexOf('response_type');
        const responseDataIndex = headers.indexOf('response_data');

        if (commandIndex === -1 || responseTypeIndex === -1 || responseDataIndex === -1) {
            console.error("❌ Chyba: Chybí hlavičky 'Povel', 'response_type' nebo 'response_data' v Commands tabulce.");
            return null;
        }

        // Procházíme řádky (začínáme od druhého, po hlavičkách)
        for (let i = 1; i < sheetData.values.length; i++) {
            const row = sheetData.values[i];
            const command = row[commandIndex]?.toLowerCase();
            const responseType = row[responseTypeIndex];
            let responseData = row[responseDataIndex];

            // Přesná shoda povelu (case-insensitive)
            if (command === userQuery.toLowerCase().trim()) {
                console.log(`✅ Povel "${userQuery}" nalezen!`);

                // Pokus o parsování response_data jako JSON, pokud to vypadá jako JSON
                if (responseData && (responseData.startsWith('{') && responseData.endsWith('}'))) {
                    try {
                        responseData = JSON.parse(responseData);
                    } catch (e) {
                        console.warn(`⚠️ Nelze parsovat response_data jako JSON pro povel "${userQuery}":`, e);
                        // Pokud parsování selže, ponecháme jako string
                    }
                }

                return {
                    response_type: responseType,
                    response_data: responseData
                };
            }
        }

        console.log(`🤷‍♀️ Povel "${userQuery}" nenalezen v Google Sheets Commands.`);
        return null; // Povel nenalezen
    } catch (error) {
        console.error("❌ Chyba při načítání dat z Google Sheets Commands:", error);
        return null;
    }
};