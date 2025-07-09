document.addEventListener('DOMContentLoaded', () => {
    const linkedinTextarea = document.getElementById('linkedinText');
    const extractButton = document.getElementById('extractButton');
    const contactForm = document.getElementById('contactForm');
    const messageDiv = document.getElementById('message');

    // Formulářová pole
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const ownerInput = document.getElementById('owner');
    const leadStatusInput = document.getElementById('leadStatus');
    const companyNameInput = document.getElementById('companyName');
    const cityInput = document.getElementById('city');
    const countryInput = document.getElementById('country');
    const industryInput = document.getElementById('industry');
    const numEmployeesInput = document.getElementById('numEmployees');
    const positionInput = document = document.getElementById('position');
    const notesTextarea = document.getElementById('notes');

    // AI Asistent elementy
    const aiPromptTextarea = document.getElementById('aiPrompt');
    const generateAiContentButton = document.getElementById('generateAiContent');
    const aiOutputDiv = document.getElementById('aiOutput');

    /**
     * Zobrazí zprávu uživateli.
     * @param {string} msg Zpráva k zobrazení.
     * @param {boolean} isError Pokud je true, zobrazí se jako chyba.
     */
    function showMessage(msg, isError) {
        messageDiv.textContent = msg;
        messageDiv.className = isError ? 'error-message' : 'success-message'; // Using existing classes
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000); // Zpráva zmizí po 5 sekundách
    }

    /**
     * Skryje zprávu.
     */
    function hideMessage() {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = '';
    }

    /**
     * Funkce pro extrakci dat z LinkedIn textu.
     * @param {string} linkedinText Text z LinkedIn profilu.
     * @returns {object} Objekt s extrahovanými daty (firstName, lastName, companyName, position, notes, linkedinUrl).
     */
    function extractLinkedInInfo(linkedinText) {
        console.log('DEBUG: extractLinkedInInfo volána s textem:', linkedinText);

        const data = {
            firstName: '',
            lastName: '',
            companyName: '',
            position: '',
            notes: '',
            linkedinUrl: ''
        };

        if (!linkedinText || typeof linkedinText !== 'string') {
            console.log('DEBUG: Vstupní text je prázdný nebo není řetězec.');
            return data;
        }

        const cleanedText = linkedinText.trim();
        let remainingTextForProcessing = cleanedText;
        console.log('DEBUG: cleanedText po trim():', cleanedText);

        // --- DŮLEŽITÉ: 1. Pokusit se extrahovat LinkedIn URL NEJPRVE ---
        // Regex upravený tak, aby http(s):// a www. byly volitelné
        const urlRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i;
        const urlMatch = cleanedText.match(urlRegex); // Hledáme URL v původním vyčištěném textu

        if (urlMatch && urlMatch[0]) {
            data.linkedinUrl = urlMatch[0];
            console.log('DEBUG: Extrahována LinkedIn URL (brzy):', data.linkedinUrl);
            // Odebereme URL z textu, který bude dále zpracováván
            remainingTextForProcessing = remainingTextForProcessing.replace(urlMatch[0], '').trim();
            console.log('DEBUG: remainingTextForProcessing po odstranění URL:', remainingTextForProcessing);
        }
        // --- KONEC EXTRAKCE URL ---

        // 2. Nyní pokračujeme s extrakcí jména a příjmení z potenciálně upraveného remainingTextForProcessing
        const namePartRegex = /^(.*?)(?:,\s*|\s*\n+\s*(?:spojení\s*\d+\.\s*stupně(?:,\s*)?)?)(.*)$/is;
        const nameMatch = remainingTextForProcessing.match(namePartRegex);
        console.log('DEBUG: nameMatch pro oddělovač jména/zbytku:', nameMatch);

        let namePart = '';
        if (nameMatch && nameMatch[1]) {
            namePart = nameMatch[1].trim();
            remainingTextForProcessing = nameMatch[2] ? nameMatch[2].trim() : '';
            console.log('DEBUG: Po rozdělení jména/zbytku - namePart:', namePart, 'remainingTextForProcessing:', remainingTextForProcessing);
        } else {
            namePart = remainingTextForProcessing;
            remainingTextForProcessing = '';
            console.log('DEBUG: Oddělovač jména nenalezen - namePart:', namePart);
        }

        const nameSplit = namePart.split(' ');
        if (nameSplit.length >= 2) {
            data.firstName = nameSplit[0];
            data.lastName = nameSplit.slice(1).join(' ');
            console.log('DEBUG: Extrahováno jméno:', data.firstName, 'příjmení:', data.lastName);
        } else if (nameSplit.length === 1) {
            data.firstName = nameSplit[0];
            console.log('DEBUG: Extrahováno pouze jméno:', data.firstName);
        }

        // 3. Extrakce pozice a společnosti z `remainingTextForProcessing`
        const cleanedRemainingText = remainingTextForProcessing.replace(/spojení\s*\d+\.\s*stupně(?:,\s*)?/i, '').trim();
        console.log('DEBUG: cleanedRemainingText po odstranění "spojení stupně":', cleanedRemainingText);

        const positionCompanyRegex = /^(?:(\d+\.\s*))?(.*?)(?:\s+ve společnosti|\s+at company|\s+zde:)\s*(.*)$/i;
        const match = cleanedRemainingText.match(positionCompanyRegex);
        console.log('DEBUG: cleanedRemainingText pro regex pozice/firma:', cleanedRemainingText);
        console.log('DEBUG: Výsledek regex match pro pozici/firmu:', match);

        if (match && match.length >= 4) {
            let rawPosition = match[2].trim();
            if (match[1]) {
                rawPosition = rawPosition.replace(new RegExp(`^${match[1].replace('.', '\\.')}\\s*`), '').trim();
            }
            data.position = rawPosition;
            data.companyName = match[3].trim();
            console.log('DEBUG: Extrahovaná pozice:', data.position, 'firma:', data.companyName);
            remainingTextForProcessing = '';
        } else {
            console.log('DEBUG: Regex pro pozici/firmu selhal. Zkouším fallback.');
            const companyKeywordIndex = cleanedRemainingText.toLowerCase().indexOf('ve společnosti');
            if (companyKeywordIndex !== -1) {
                let rawPosition = cleanedRemainingText.substring(0, companyKeywordIndex).trim();
                rawPosition = rawPosition.replace(/^\d+\.\s*/, '').trim();
                data.position = rawPosition;
                data.companyName = cleanedRemainingText.substring(companyKeywordIndex + 've společnosti'.length).trim();
                remainingTextForProcessing = '';
                console.log('DEBUG: Fallback extrahoval pozici:', data.position, 'firmu:', data.companyName);
            } else {
                console.log('DEBUG: Fallback také selhal. Zbylý text půjde do poznámek.');
                remainingTextForProcessing = cleanedRemainingText;
            }
        }

        // Vše, co zbylo v `remainingTextForProcessing` po všech pokusech o parsování, jde do poznámek
        if (remainingTextForProcessing) {
            data.notes = (data.notes ? data.notes + '\n' : '') + 'Nerozpoznaná data z LinkedIn:\n' + remainingTextForProcessing;
            console.log('DEBUG: Poznámky aktualizovány se zbylým textem:', data.notes);
        }

        console.log('DEBUG: Konečná extrahovaná data:', data);
        return data;
    }

    // Event listener pro tlačítko "Extrahovat data"
    extractButton.addEventListener('click', () => {
        console.log('DEBUG: Tlačítko "Extrahovat data" bylo kliknuto.');
        hideMessage();
        const linkedinInput = linkedinTextarea.value;
        console.log('DEBUG: Vstupní text z textarea:', linkedinInput);
        const extracted = extractLinkedInInfo(linkedinInput);
        console.log('DEBUG: Data vrácená z extractLinkedInInfo:', extracted);

        // Vyplnění formuláře extrahovanými daty
        firstNameInput.value = extracted.firstName;
        lastNameInput.value = extracted.lastName;
        companyNameInput.value = extracted.companyName;
        positionInput.value = extracted.position;

        // Zobrazení LinkedIn URL
        if (extracted.linkedinUrl) {
            const urlNote = `LinkedIn Profil: ${extracted.linkedinUrl}`;
            notesTextarea.value = (notesTextarea.value ? notesTextarea.value + '\n\n' : '') + urlNote;
        }

        // Přidání poznámek do pole notes (pokud ještě nebyly přidány URL)
        // Důležité: Pokud extracted.notes již obsahuje "Nerozpoznaná data z LinkedIn",
        // a přidali jsme LinkedIn URL, chceme je mít spolu.
        // Jinak jen přidáme extrahované poznámky.
        if (extracted.notes && !extracted.notes.includes('LinkedIn Profil:')) {
            // Pouze pokud poznámky nebyly již zaneseny URL a nerozpoznanými daty společně
            notesTextarea.value = (notesTextarea.value ? notesTextarea.value + '\n\n' : '') + extracted.notes;
        } else if (!extracted.linkedinUrl && !extracted.notes) { // Pokud nic nebylo extrahováno, vyčistíme notes
            notesTextarea.value = '';
        }

        // Zobrazení zprávy uživateli
        if (extracted.firstName || extracted.lastName || extracted.companyName || extracted.position || extracted.notes || extracted.linkedinUrl) {
            showMessage('Data úspěšně extrahována! Zkontrolujte a doplňte formulář.', false);
        } else {
            showMessage('Extrakce se nezdařila. Zkontrolujte prosím formát textu.', true);
        }
    });

    // Event listener pro odeslání formuláře
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Zabrání výchozímu odeslání formuláře

        showMessage('Odesílám data...', false); // Zobrazí zprávu o odesílání

        const contactData = {
            firstName: firstNameInput.value,
            lastName: lastNameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            owner: ownerInput.value,
            leadStatus: leadStatusInput.value,
            companyName: companyNameInput.value,
            city: cityInput.value,
            country: countryInput.value,
            industry: industryInput.value,
            numEmployees: numEmployeesInput.value,
            position: positionInput.value,
            notes: notesTextarea.value
        };

        console.log('Odesílaná data:', contactData);

        try {
            // Simulace odesílání dat na backend/Make.com webhook
            // V reálné aplikaci by zde byl fetch request na tvůj Make.com webhook URL
            const simulatedResponse = await new Promise(resolve => setTimeout(() => {
                // Zde by Make.com vrátil nějakou odpověď, např. URL nového kontaktu v HubSpotu
                resolve({ success: true, message: 'Kontakt úspěšně uložen do HubSpotu!' });
            }, 2000)); // Simulace 2 sekund zpoždění

            if (simulatedResponse.success) {
                showMessage('Kontakt úspěšně uložen do HubSpotu!', false);
                contactForm.reset(); // Vyčistí formulář po úspěšném odeslání
                aiOutputDiv.textContent = ''; // Vyčistí AI výstup
            } else {
                showMessage('Chyba při ukládání kontaktu.', true);
            }
        } catch (error) {
            showMessage('Došlo k chybě při odesílání dat formuláře.', true);
            console.error('Chyba odesílání formuláře:', error);
        }
    });

    // AI Asistent - Generování obsahu
    generateAiContentButton.addEventListener('click', async () => {
        showMessage('Generuji obsah AI...', false);
        aiOutputDiv.textContent = 'Generuji... Prosím čekejte.'; // Okamžitá zpětná vazba

        const currentContactData = {
            firstName: firstNameInput.value,
            lastName: lastNameInput.value,
            companyName: companyNameInput.value,
            position: positionInput.value,
            industry: industryInput.value,
            aiPrompt: aiPromptTextarea.value
        };

        console.log('Data pro generování AI obsahu:', currentContactData);

        try {
            // Simulace volání AI asistenta
            // V reálné aplikaci by zde byl fetch request na tvůj AI API endpoint
            const simulatedAiResponse = await new Promise(resolve => setTimeout(() => {
                const aiResult = `Na základě dat pro ${currentContactData.firstName} ${currentContactData.lastName} ze společnosti ${currentContactData.companyName} (${currentContactData.position}):\n\nNávrh 1: Personalizovaný e-mail o řešení výzev v ${currentContactData.industry}.\nNávrh 2: LinkedIn zpráva s odkazem na relevantní případovou studii.\nNávrh 3: Téma pro schůzku: Jak optimalizovat procesy v předmontáži s naším řešením.`;
                resolve({ success: true, generatedText: aiResult });
            }, 2000)); // Simulace 2 sekund zpoždění

            if (simulatedAiResponse.success) {
                aiOutputDiv.textContent = simulatedAiResponse.generatedText;
                showMessage('Obsah AI úspěšně vygenerován!', false);
            } else {
                aiOutputDiv.textContent = 'Nepodařilo se vygenerovat obsah AI.';
                showMessage('Chyba při generování obsahu AI.', true);
            }
        } catch (error) {
            aiOutputDiv.textContent = 'Došlo k chybě při komunikaci s AI asistentem.';
            showMessage('Došlo k chybě při generování obsahu AI.', true);
            console.error('Chyba volání AI asistenta:', error);
        }
    });

    // Reset formuláře také vymaže zprávy
    contactForm.addEventListener('reset', () => {
        hideMessage();
        aiOutputDiv.textContent = ''; // Vyčistí AI výstup
    });
}); // Uzavírá DOMContentLoaded listener