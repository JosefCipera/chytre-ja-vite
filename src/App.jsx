import React, { useState, useEffect, useRef } from "react";

// Hlavní komponenta aplikace
function App() {
  // --- Stavy pro obecné UI a zprávy ---
  const [loading, setLoading] = useState(false); // Pro indikaci načítání/odesílání
  const [message, setMessage] = useState(null); // Pro zprávy o úspěchu
  const [error, setError] = useState(null); // Pro zprávy o chybách

  // --- Stavy pro data nového kontaktu (pro HubSpot) - přesunuto do App pro sdílení ---
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactCompany, setNewContactCompany] = useState("");
  const [newContactPosition, setNewContactPosition] = useState("");
  const [newContactLinkedin, setNewContactLinkedin] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");

  // --- Stavy pro chatovací rozhraní ---
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatHistoryRef = useRef(null);

  // --- Nový stav pro řízení zobrazení (marketplace vs. agent) ---
  const [currentView, setCurrentView] = useState('marketplace'); // 'marketplace', 'marketing', 'finance', 'vyroba', 'strateg'
  const [dynamicContent, setDynamicContent] = useState(null); // Pro zobrazení URL obsahu (např. iframe)

  // Funkce pro zobrazení zpráv/chyb
  const showMessage = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 5000); // Zpráva zmizí po 5 sekundách
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 8000); // Chyba zmizí po 8 sekundách
  };

  // Automatické scrollování chatu dolů
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Funkce pro extrakci dat z LinkedIn textu
  const extractDataFromLinkedin = () => {
    // Toto je základní simulace/placeholder pro extrakci.
    // V reálné aplikaci byste zde použili sofistikovanější RegEx,
    // nebo zavolali AI (přes backend), aby text analyzovala a extrahovala data.
    console.log("Extrahuji data z LinkedIn textu:", newContactLinkedin);
    const text = newContactLinkedin;
    let extractedName = "";
    let extractedCompany = "";
    let extractedPosition = "";

    // Jednoduché RegEx pro jméno (předpoklad: Jméno Příjmení)
    const nameMatch = text.match(/^(.*?),\s*spojení/);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }

    // Jednoduché RegEx pro pozici a firmu (předpoklad: Pozice ve společnosti Firma)
    const positionCompanyMatch = text.match(/(Vedoucí|Specialista|Manažer|Developer|Provozní|Obchodní).*? ve společnosti (.*?)(?: a\.s\.| s\.r\.o\.| spol\. s r\.o\.)?/i);
    if (positionCompanyMatch) {
      extractedPosition = positionCompanyMatch[1] ? positionCompanyMatch[1].trim() : '';
      extractedCompany = positionCompanyMatch[2] ? positionCompanyMatch[2].trim() : '';
    } else {
      // Alternativní match pro firmu, pokud předchozí selže
      const companyOnlyMatch = text.match(/společnosti\s+(.*?)(?: a\.s\.| s\.r\.o\.| spol\. s r\.o\.)?/i);
      if (companyOnlyMatch && companyOnlyMatch[1]) {
        extractedCompany = companyOnlyMatch[1].trim();
      }
    }


    setNewContactName(extractedName);
    setNewContactCompany(extractedCompany);
    setNewContactPosition(extractedPosition);
    // Email a Notes zatím nelze z LinkedIn textu jednoduše extrahovat, zůstanou prázdné
    setNewContactEmail("");
    setNewContactNotes("");

    showMessage("Data z LinkedIn extrahována!", "success");
  };

  // Funkce pro uložení kontaktu do HubSpotu (volá backend)
  const saveContactToHubspot = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Zde je validace, zda jsou povinná pole vyplněna
    if (!newContactName || !newContactEmail) {
      showError("Jméno a email jsou povinná pole pro uložení kontaktu.");
      setLoading(false);
      return;
    }

    const contactData = {
      firstName: newContactName,
      email: newContactEmail,
      company: newContactCompany,
      position: newContactPosition,
      linkedinText: newContactLinkedin, // Odesíláme i původní text pro záznam
      notes: newContactNotes,
    };

    try {
      // Předpokládaný backendový endpoint pro ukládání kontaktů do HubSpotu
      const response = await fetch("/api/save-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.content || "Chyba při ukládání kontaktu do HubSpotu.");
      }

      const result = await response.json();
      showMessage(result.message || "Kontakt úspěšně uložen do HubSpotu!", "success");
      // Vyčistit formulář po uložení
      setNewContactName("");
      setNewContactEmail("");
      setNewContactCompany("");
      setNewContactPosition("");
      setNewContactLinkedin("");
      setNewContactNotes("");
    } catch (err) {
      console.error("Chyba při ukládání kontaktu:", err);
      showError(`Nepodařilo se uložit kontakt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro odeslání dotazu AI orchestrátoru na backend (platí pro všechny agenty)
  const processCommand = async () => {
    if (!userInput.trim()) return;

    const userQuery = userInput;
    setChatHistory((prev) => [...prev, { sender: "user", text: userQuery }]);
    setUserInput(""); // Vymaže input hned po odeslání
    setLoading(true);
    setDynamicContent(null); // Skryj dynamický obsah při nové zprávě

    try {
      // Předpokládáme backendový endpoint pro zpracování dotazů
      const response = await fetch("/api/process-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userQuery, currentAgent: currentView }), // Posíláme i aktuálního agenta
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.content || "Chyba při komunikaci s AI orchestrátorem.");
      }

      const data = await response.json();
      console.log("Response from backend:", data);

      // Zpracování odpovědi z backendu
      if (data.type === 'command') {
        // Zpracování specifických povelů
        switch (data.commandType) {
          case 'url':
            setChatHistory((prev) => [...prev, { sender: "ai", text: `Otevírám: ${data.commandData.title}` }]);
            // Dynamicky vlož iframe
            setDynamicContent({ type: 'iframe', url: data.commandData.url, title: data.commandData.title });
            break;
          case 'notification':
            showMessage(data.commandData.message, data.commandData.severity);
            setChatHistory((prev) => [...prev, { sender: "ai", text: data.commandData.message }]);
            break;
          case 'agent':
            setChatHistory((prev) => [...prev, { sender: "ai", text: `Přesměrovávám na agenta: ${data.commandData.agentName}. ${data.commandData.message}` }]);
            // Zde by mohla být logika pro zobrazení UI pro konkrétního agenta
            // V našem případě to již řídí currentView
            break;
          default:
            setChatHistory((prev) => [...prev, { sender: "ai", text: `Neznámý typ povelu: ${data.commandType}. ${data.content}` }]);
        }
      } else if (data.type === 'text') {
        // Standardní textová odpověď
        setChatHistory((prev) => [...prev, { sender: "ai", text: data.content }]);
      } else if (data.type === 'error') {
        showError(data.content);
        setChatHistory((prev) => [...prev, { sender: "ai", text: `Chyba: ${data.content}` }]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showError(`Došlo k chybě: ${err.message}`);
      setChatHistory((prev) => [...prev, { sender: "ai", text: `Omlouvám se, došlo k chybě: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Komponenta pro zobrazení Marketplace
  const MarketplaceView = () => (
    <div className="flex flex-col items-center justify-center p-4 min-h-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Centrum specializovaných agentů</h2>
      <p className="text-gray-600 mb-8 text-center max-w-lg">
        Vyberte agenta, kterého potřebujete. Jedna aplikace - nekonečné možnosti.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Příklady pro jednotlivé agenty */}
        <div className="marketplace-item bg-white shadow-lg rounded-lg p-6 flex flex-col items-center text-center">
          <img src="/images/finance-192.png" alt="Finance Agent" className="w-24 h-24 mb-4" />
          <h3 className="text-xl font-semibold mb-2">AI agent Finance</h3>
          <p className="text-gray-600 mb-4">Specialista na finanční řízení a podporu rozhodování.</p>
          <button
            onClick={() => setCurrentView('finance')}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700 transition duration-300"
          >
            Spusť agenta
          </button>
        </div>

        <div className="marketplace-item bg-white shadow-lg rounded-lg p-6 flex flex-col items-center text-center">
          <img src="/images/vyroba-192.png" alt="Výroba Agent" className="w-24 h-24 mb-4" />
          <h3 className="text-xl font-semibold mb-2">AI agent Výroba</h3>
          <p className="text-gray-600 mb-4">Expert na plánování výroby a simulaci vytížení kapacit.</p>
          <button
            onClick={() => setCurrentView('vyroba')}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700 transition duration-300"
          >
            Spusť agenta
          </button>
        </div>

        <div className="marketplace-item bg-white shadow-lg rounded-lg p-6 flex flex-col items-center text-center">
          <img src="/images/marketing-192.png" alt="Marketing Agent" className="w-24 h-24 mb-4" />
          <h3 className="text-xl font-semibold mb-2">AI agent Marketing</h3>
          <p className="text-gray-600 mb-4">Expert na hodnotovou nabídku a segmentaci zákazníků.</p>
          <button
            onClick={() => setCurrentView('marketing')}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700 transition duration-300"
          >
            Spusť agenta
          </button>
        </div>

        <div className="marketplace-item bg-white shadow-lg rounded-lg p-6 flex flex-col items-center text-center">
          <img src="/images/strateg-192.png" alt="Stratég Agent" className="w-24 h-24 mb-4" />
          <h3 className="text-xl font-semibold mb-2">AI agent Stratég</h3>
          <p className="text-gray-600 mb-4">Specialista na inovativní byznys modely a strategie.</p>
          <button
            onClick={() => setCurrentView('strateg')}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700 transition duration-300"
          >
            Spusť agenta
          </button>
        </div>
      </div>
    </div>
  );

  // Generická komponenta pro zobrazení agenta (prozatím pro Finance, Výroba, Stratég)
  const AgentView = ({ agentName, description }) => (
    <div className="flex flex-col h-full bg-gray-100 p-4">
      <button
        onClick={() => setCurrentView('marketplace')}
        className="mb-4 bg-gray-300 text-gray-800 py-2 px-4 rounded-md shadow hover:bg-gray-400 transition duration-300 self-start"
      >
        ← Zpět na Marketplace
      </button>
      <h2 className="text-2xl font-bold mb-2 text-gray-800">{agentName}</h2>
      <p className="text-gray-600 mb-4">{description}</p>

      {/* Zprávy o úspěchu/chybě */}
      {message && (
        <div className={`p-3 rounded-md mb-4 text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">
          {error}
        </div>
      )}

      {/* Chatovací rozhraní */}
      <div
        ref={chatHistoryRef}
        className="flex-grow overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 bg-gray-50"
      >
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
        {loading && (
          <div className="text-center text-gray-500">AI přemýšlí...</div>
        )}
      </div>

      {/* Dynamicky vložený obsah (iframe) */}
      {dynamicContent && dynamicContent.type === 'iframe' && (
        <div className="mb-4 bg-white p-2 rounded-md shadow-inner" style={{ height: '500px' }}>
          <h4 className="text-lg font-semibold mb-2">{dynamicContent.title}</h4>
          <iframe
            src={dynamicContent.url}
            title={dynamicContent.title}
            width="100%"
            height="calc(100% - 30px)" // Adjust height for title
            frameBorder="0"
            allowFullScreen
            className="rounded-md"
          ></iframe>
        </div>
      )}

      <div className="flex">
        <input
          type="text"
          className="flex-grow border border-gray-300 rounded-l-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={`Zadejte dotaz pro agenta ${agentName.toLowerCase()}...`}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') processCommand(); }}
        />
        <button
          onClick={processCommand}
          disabled={loading}
          className="bg-indigo-600 text-white py-2 px-4 rounded-r-md shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Odesílám..." : "Odeslat"}
        </button>
      </div>
    </div>
  );

  // Nová komponenta pro specifické UI Marketing Agenta
  const MarketingAgentSpecificView = () => (
    <div className="flex flex-col h-full bg-gray-100 p-4 overflow-y-auto"> {/* Přidán overflow-y-auto */}
      <button
        onClick={() => setCurrentView('marketplace')}
        className="mb-4 bg-gray-300 text-gray-800 py-2 px-4 rounded-md shadow hover:bg-gray-400 transition duration-300 self-start"
      >
        ← Zpět na Marketplace
      </button>
      <h2 className="text-2xl font-bold mb-2 text-gray-800">AI agent Marketing</h2>
      <p className="text-gray-600 mb-4">
        Specialista na hodnotovou nabídku a segmentaci zákazníků. Zde můžete spravovat kontakty a generovat marketingový obsah.
      </p>

      {/* Zprávy o úspěchu/chybě */}
      {message && (
        <div className={`p-3 rounded-md mb-4 text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">
          {error}
        </div>
      )}

      {/* Sekce pro zadání a předvyplnění kontaktu */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Zadání a předvyplnění kontaktu</h3>
        <div className="mb-4">
          <label htmlFor="linkedinText" className="block text-gray-700 text-sm font-bold mb-2">
            Vložte text z LinkedIn profilu (pro automatické předvyplnění):
          </label>
          <textarea
            id="linkedinText"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Např.: Jaroslav Havel, spojení 2. stupně, Vedoucí provozu Předmontáž ve společnosti ŠKODA TRANSPORTATION a.s."
            value={newContactLinkedin}
            onChange={(e) => setNewContactLinkedin(e.target.value)}
            rows="3"
          ></textarea>
          <button
            onClick={extractDataFromLinkedin}
            className="mt-2 bg-blue-500 text-white py-2 px-4 rounded-md shadow hover:bg-blue-600 transition duration-300"
          >
            Extrahovat data
          </button>
        </div>

        <h3 className="text-lg font-semibold mb-3">Základní informace o kontaktu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-gray-700 text-sm font-bold mb-2">Jméno:</label>
            <input type="text" id="firstName" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input type="email" id="email" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="company" className="block text-gray-700 text-sm font-bold mb-2">Firma:</label>
            <input type="text" id="company" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={newContactCompany} onChange={(e) => setNewContactCompany(e.target.value)} />
          </div>
          <div>
            <label htmlFor="position" className="block text-gray-700 text-sm font-bold mb-2">Pozice:</label>
            <input type="text" id="position" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={newContactPosition} onChange={(e) => setNewContactPosition(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">Doplňující informace / Poznámky AI asistenta:</label>
          <textarea id="notes" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" rows="3" value={newContactNotes} onChange={(e) => setNewContactNotes(e.target.value)}></textarea>
        </div>
        <button
          onClick={saveContactToHubspot}
          disabled={loading}
          className="mt-4 bg-green-500 text-white py-2 px-4 rounded-md shadow hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
        >
          {loading ? "Ukládám..." : "Uložit kontakt (do HubSpot přes Make)"}
        </button>
      </div>

      {/* Sekce pro interakci s AI Asistentem Marketing - Chat */}
      <div className="bg-white p-6 rounded-lg shadow flex-grow flex flex-col">
        <h3 className="text-xl font-semibold mb-4">Interakce s AI Asistentem Marketing</h3>
        <p className="text-gray-600 mb-4">
          Tato sekce slouží pro generování marketingových nápadů a textů pomocí AI na základě dat z formuláře, nebo obecných marketingových dotazů.
        </p>

        {/* Chatovací rozhraní - stejné jako v AgentView */}
        <div
          ref={chatHistoryRef}
          className="flex-grow overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 bg-gray-50"
        >
          {chatHistory.length === 0 ? (
            <p className="text-gray-500 text-center">Zatím žádná konverzace. Zeptejte se na něco marketingového!</p>
          ) : (
            chatHistory.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  {msg.text}
                </span>
              </div>
            ))
          )}
          {loading && (
            <div className="text-center text-gray-500">AI přemýšlí...</div>
          )}
        </div>

        {/* Dynamicky vložený obsah (iframe) - pokud by marketingAgent generoval URL */}
        {dynamicContent && dynamicContent.type === 'iframe' && (
          <div className="mb-4 bg-white p-2 rounded-md shadow-inner" style={{ height: '500px' }}>
            <h4 className="text-lg font-semibold mb-2">{dynamicContent.title}</h4>
            <iframe
              src={dynamicContent.url}
              title={dynamicContent.title}
              width="100%"
              height="calc(100% - 30px)"
              frameBorder="0"
              allowFullScreen
              className="rounded-md"
            ></iframe>
          </div>
        )}

        <div className="flex mt-auto"> {/* mt-auto pro přilepení k dolnímu okraji */}
          <input
            type="text"
            className="flex-grow border border-gray-300 rounded-l-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Napište marketingový dotaz, např. Navrhni 3 emaily..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') processCommand(); }}
          />
          <button
            onClick={processCommand}
            disabled={loading}
            className="bg-indigo-600 text-white py-2 px-4 rounded-r-md shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Odesílám..." : "Odeslat"}
          </button>
        </div>
      </div>
    </div>
  );

  // Hlavní renderovací funkce App komponenty
  const renderView = () => {
    switch (currentView) {
      case 'marketplace':
        return <MarketplaceView />;
      case 'marketing':
        return <MarketingAgentSpecificView />; // Zde voláme novou specifickou komponentu pro marketing
      case 'finance':
        return <AgentView agentName="AI agent Finance" description="Specialista na finanční řízení a podporu rozhodování." />;
      case 'vyroba':
        return <AgentView agentName="AI agent Výroba" description="Expert na plánování výroby a simulaci vytížení kapacit." />;
      case 'strateg':
        return <AgentView agentName="AI agent Stratég" description="Specialista na inovativní byznys modely a strategie." />;
      default:
        return <MarketplaceView />; // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-4xl text-center py-6">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-2">Chytré Já</h1>
        <p className="text-lg text-gray-600">Váš inteligentní asistent</p>
      </header>

      <main className="w-full max-w-4xl bg-white shadow-xl rounded-lg p-8 h-[70vh] flex flex-col">
        {renderView()}
      </main>

      <footer className="w-full max-w-4xl text-center py-4 text-gray-500 text-sm">
        <p>© 2025 Smart Agent Platform. Všechna práva vyhrazena.</p>
      </footer>
    </div>
  );
}

export default App;