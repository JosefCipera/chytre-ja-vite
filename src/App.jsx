import React, { useState, useEffect, useRef } from "react";

// Hlavní komponenta aplikace
function App() {
  // --- Stavy pro obecné UI a zprávy ---
  const [loading, setLoading] = useState(false); // Pro indikaci načítání/odesílání
  const [message, setMessage] = useState(null); // Pro zprávy o úspěchu
  const [error, setError] = useState(null); // Pro zprávy o chybách

  // --- Stavy pro data nového kontaktu (pro HubSpot) ---
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactCompany, setNewContactCompany] = useState(""); // Nové pole pro firmu
  const [newContactPosition, setNewContactPosition] = useState(""); // Nové pole pro pozici
  const [newContactLinkedin, setNewContactLinkedin] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");

  // --- Stavy pro chatovací rozhraní (zachováno pro budoucí využití/dialog) ---
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatHistoryRef = useRef(null);

  // URL pro Make.com webhook pro Marketing Agenta
  // Tuto URL budete muset nahradit skutečnou URL z vašeho Make.com scénáře!
  const makeWebhookUrlMarketing = "https://hook.eu1.make.com/rhnfp6oa5swwcthpvvb1oq57xc9ek5ae";

  // Funkce pro odeslání dat nového kontaktu do Make.com (pro HubSpot)
  const handleAddContact = async () => {
    // Kontrola, zda jsou vyplněny alespoň základní údaje
    if (!newContactName || !newContactCompany || !newContactPosition) {
      setError("Vyplňte prosím Jméno, Firmu a Pozici.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setMessage("Odesílám kontakt do HubSpotu...");
    setError(null); // Resetovat chyby

    try {
      const response = await fetch(makeWebhookUrlMarketing, { // *** OPRAVENO ZDE: Použito makeWebhookUrlMarketing ***
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newContactName,
          email: newContactEmail,
          company: newContactCompany,
          position: newContactPosition,
          linkedinUrl: newContactLinkedin,
          notes: newContactNotes,
        }),
      });

      if (response.ok) { // Kontrola, zda je status kódu 2xx (např. 200 OK)
        // Předpokládáme, že Make.com nyní vrací JSON { "message": "...", "submittedName": "..." }
        const result = await response.json();
        setMessage(`Úspěšně přidáno: ${result.message || 'Kontakt uložen.'} Odeslané jméno: ${result.submittedName || 'Neznámé'}`); // Zde zobrazujeme message a submittedName z odpovědi

        // Vymazání formuláře po úspěšném odeslání
        setNewContactName('');
        setNewContactEmail('');
        setNewContactCompany('');
        setNewContactPosition('');
        setNewContactLinkedin('');
        setNewContactNotes('');

      } else {
        // Zpracování chybových HTTP statusů (např. 404, 500)
        let errorMsg = `Nepodařilo se přidat kontakt do HubSpotu. Status: ${response.status}.`;
        try {
          const errorData = await response.json(); // Zkusíme parsovat jako JSON, pokud server chybu vrátí v JSONu
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (jsonErr) {
          // Pokud odpověď není JSON, vezmeme ji jako text
          const textError = await response.text();
          errorMsg = `${errorMsg} Odpověď serveru: ${textError}`;
        }
        throw new Error(errorMsg);
      }

    } catch (err) {
      setError(`Chyba při odesílání: ${err.message}`);
      setMessage(null);
      console.error("Chyba při odesílání dat do Make.com:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Funkce pro chatovací rozhraní (zachováno, ale pro účely Marketing Agenta bude potřeba upravit logiku volání AI) ---
  const processCommand = async (command = userInput) => {
    if (!command.trim()) return;

    const userMessage = { sender: 'user', text: command };
    setChatHistory((prev) => [...prev, userMessage]);
    setUserInput('');
    setLoading(true);

    try {
      const response = await fetch('VLOZTE_ZDE_URL_PRO_VASI_AI_SLUZBU', { // Zde může být AI pro generování textu nebo odpovědí
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: command }),
      });

      if (!response.ok) {
        throw new Error(`HTTP chyba! Status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = { sender: 'bot', text: data.reply || 'Nerozumím vašemu dotazu.' };
      setChatHistory((prev) => [...prev, botMessage]);

    } catch (err) {
      const errorMessage = { sender: 'bot', text: `Omlouvám se, došlo k chybě: ${err.message}` };
      setChatHistory((prev) => [...prev, errorMessage]);
      console.error("Chyba při komunikaci s AI:", err);
    } finally {
      setLoading(false);
      // Přejdeme na konec chatu po odpovědi
      if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
      }
    }
  };

  // Efekt pro posun chatu dolů
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">AI Agent Marketing</h1>
      <p className="text-lg text-gray-600 mb-8 text-center">
        Zde můžete spravovat kontakty a využívat asistenta pro marketingové účely.
      </p>

      {/* --- Sekce pro přidání nového kontaktu --- */}
      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Přidat nový kontakt do HubSpotu</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="newContactName" className="block text-sm font-medium text-gray-700">Jméno a Příjmení</label>
            <input
              type="text"
              id="newContactName"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Jan Novák"
            />
          </div>
          <div>
            <label htmlFor="newContactEmail" className="block text-sm font-medium text-gray-700">E-mail (volitelné)</label>
            <input
              type="email"
              id="newContactEmail"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              placeholder="jan.novak@example.com"
            />
          </div>
          <div>
            <label htmlFor="newContactCompany" className="block text-sm font-medium text-gray-700">Firma</label>
            <input
              type="text"
              id="newContactCompany"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newContactCompany}
              onChange={(e) => setNewContactCompany(e.target.value)}
              placeholder="ABC Manufacturing s.r.o."
            />
          </div>
          <div>
            <label htmlFor="newContactPosition" className="block text-sm font-medium text-gray-700">Pozice</label>
            <input
              type="text"
              id="newContactPosition"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newContactPosition}
              onChange={(e) => setNewContactPosition(e.target.value)}
              placeholder="Výrobní ředitel"
            />
          </div>
          <div>
            <label htmlFor="newContactLinkedin" className="block text-sm font-medium text-gray-700">LinkedIn Profil URL (volitelné)</label>
            <input
              type="url"
              id="newContactLinkedin"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newContactLinkedin}
              onChange={(e) => setNewContactLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/jan-novak"
            />
          </div>
          <div>
            <label htmlFor="newContactNotes" className="block text-sm font-medium text-gray-700">Poznámky (volitelné)</label>
            <textarea
              id="newContactNotes"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows="3"
              value={newContactNotes}
              onChange={(e) => setNewContactNotes(e.target.value)}
              placeholder="Poznámky z LinkedIn profilu nebo prvního kontaktu..."
            ></textarea>
          </div>
          <button
            onClick={handleAddContact}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Odesílám..." : "Přidat kontakt do HubSpotu"}
          </button>
        </div>
        {message && <p className="text-green-600 mt-4 text-center">{message}</p>}
        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
      </section>

      {/* --- Sekce pro chatování (zachováno pro AI asistenta pro marketing) --- */}
      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Interakce s AI Asistentem Marketing</h2>
        <div ref={chatHistoryRef} className="chat-history h-64 overflow-y-auto border border-gray-300 rounded-md p-4 mb-4 bg-gray-50">
          {chatHistory.length === 0 ? (
            <p className="text-gray-500 text-center">Zatím žádná konverzace. Zeptejte se na něco!</p>
          ) : (
            chatHistory.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  {msg.text}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex">
          <input
            type="text"
            className="flex-grow border border-gray-300 rounded-l-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Zadejte marketingový dotaz..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') processCommand(); }}
          />
          <button
            onClick={() => processCommand()}
            disabled={loading}
            className="bg-indigo-600 text-white py-2 px-4 rounded-r-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "..." : "Odeslat"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;