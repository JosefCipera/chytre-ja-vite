import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';

// Funkce pro převod souboru na base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Získejte base64 řetězec po "data:image/png;base64,"
    reader.onerror = error => reject(error);
  });
};

// Hlavní komponenta aplikace
function App() {
  // Stavy Firebase
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);

  // Stavy logiky aplikace
  const [image, setImage] = useState(null); // Data obrázku v base64
  const [prompt, setPrompt] = useState(''); // Specifický požadavek uživatele na zprávu
  const [additionalData, setAdditionalData] = useState(''); // Doplňující CRM data
  const [generatedMessage, setGeneratedMessage] = useState(''); // Zpráva vygenerovaná AI
  const [loading, setLoading] = useState(false); // Celkový stav načítání pro generování/zpracování AI
  const [messageFeedback, setMessageFeedback] = useState(''); // Zprávy pro uživatele
  const [messageType, setMessageType] = useState('info'); // Typ zprávy: 'info', 'success', 'error'
  const [savedContacts, setSavedContacts] = useState([]); // Seznam uložených kontaktů
  const [selectedContact, setSelectedContact] = useState(null); // Aktuálně vybraný kontakt pro generování zprávy

  // Stavy pro modální okno extrakce
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [modalContactData, setModalContactData] = useState({
    id: null, // Přidáno pro uchování ID při editaci existujícího kontaktu
    name: '', title: '', company: '', location: '', recentActivity: '', contactReason: ''
  });

  // Stavy pro modální okno potvrzení smazání
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  // Ref pro vstup souboru k vymazání
  const fileInputRef = useRef(null);

  // Funkce pro zobrazení zpětné vazby
  const showFeedback = (message, type = 'info') => {
    setMessageFeedback(message);
    setMessageType(type);
  };

  // Inicializace a ověřování Firebase
  useEffect(() => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    let firebaseAppInstance;
    let firestoreDbInstance;
    let firebaseAuthInstance;

    try {
      firebaseAppInstance = initializeApp(firebaseConfig);
      firestoreDbInstance = getFirestore(firebaseAppInstance);
      firebaseAuthInstance = getAuth(firebaseAppInstance);

      setDb(firestoreDbInstance);
      setAuth(firebaseAuthInstance);

      const doInitialSignIn = async () => {
        let signInSuccessful = false;
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(firebaseAuthInstance, __initial_auth_token);
            console.log("Přihlášen vlastním tokenem.");
            signInSuccessful = true;
          } else {
            await signInAnonymously(firebaseAuthInstance);
            console.log("Přihlášen anonymně (žádný vlastní token).");
            signInSuccessful = true;
          }
        } catch (e) {
          if (e.code === 'auth/invalid-custom-token' || e.code === 'auth/invalid-claims') {
            console.warn("Vlastní token je neplatný nebo vypršel. Pokus o anonymní přihlášení...");
            try {
              await signInAnonymously(firebaseAuthInstance);
              console.log("Úspěšně se přešlo na anonymní přihlášení.");
              signInSuccessful = true;
            } catch (anonError) {
              console.error("Chyba při přechodu na anonymní přihlášení:", anonError);
              setFirebaseError("Nepodařilo se ověřit ani anonymně. Zkuste to prosím znovu.");
            }
          } else {
            console.error("Chyba během počátečního přihlašování Firebase:", e);
            setFirebaseError(`Chyba při přihlašování: ${e.message}.`);
          }
        } finally {
          setLoadingFirebase(false);
          if (signInSuccessful) {
            setFirebaseError(null);
          }
        }
      };

      doInitialSignIn();

      const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null);
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Chyba inicializace Firebase:", e);
      setFirebaseError("Nepodařilo se inicializovat aplikaci. Obnovte prosím stránku.");
      setLoadingFirebase(false);
    }
  }, []);

  // Načítání a poslouchání uložených kontaktů z Firestore
  useEffect(() => {
    if (!db || !userId) {
      return;
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const contactsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/contacts`);
    const q = query(contactsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedContacts(contactsData);
      if (selectedContact) {
        // Pokud je vybraný kontakt stále v seznamu, aktualizujte ho
        const updatedSelected = contactsData.find(c => c.id === selectedContact.id);
        if (updatedSelected) {
          setSelectedContact(updatedSelected);
        } else {
          // Pokud vybraný kontakt již neexistuje (byl smazán), zrušte výběr
          setSelectedContact(null);
          setGeneratedMessage(''); // Vyčistit zprávu, pokud byl vybraný kontakt smazán
        }
      }
    }, (err) => {
      console.error("Chyba při načítání kontaktů:", err);
      showFeedback("Nepodařilo se načíst kontakty. Zkuste to prosím znovu.", 'error');
    });

    return () => unsubscribe();
  }, [db, userId, selectedContact]);

  // Funkce pro extrakci informací z obrázku/dat pomocí AI
  const extractProfileInfo = async (imageData, inputAdditionalData) => {
    setLoading(true);
    showFeedback('', 'info'); // Vyčistit zprávu
    try {
      let parts = [];
      if (imageData) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: imageData
          }
        });
      }
      parts.push({
        text: `Jste asistent pro extrakci dat. Prosím, analyzujte poskytnutý snímek obrazovky LinkedIn profilu (pokud je k dispozici) a/nebo dodatečná textová data (pokud jsou k dispozici). Vraťte strukturovaný JSON objekt obsahující klíčové detaily. Identifikujte 'name' (celé jméno), 'title' (pozice), 'company' (společnost), 'location' (lokace), 'recentActivity' (stručné shrnutí nedávných příspěvků/interakcí, pokud je viditelné), 'contactReason' (proč by tato osoba mohla být dobrým potenciálním zákazníkem, na základě jejího profilu/aktivity). Pokud informace není k dispozici, použijte "N/A".
                ${inputAdditionalData ? `Dodatečná data: "${inputAdditionalData}".` : ''}
                Odpovězte pouze platným JSON objektem.`
      });

      const payload = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              title: { type: "STRING" },
              company: { type: "STRING" },
              location: { type: "STRING" },
              recentActivity: { type: "STRING" },
              contactReason: { type: "STRING" }
            },
            propertyOrdering: ["name", "title", "company", "location", "recentActivity", "contactReason"]
          }
        }
      };

      const apiKey = ""; // Canvas to poskytne za běhu
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Chyba API během extrakce: ${response.status} - ${errorData.error?.message || 'Neznámá chyba'}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(jsonString); // Mělo by být již JSON díky responseSchema
        return parsedJson;
      } else {
        throw new Error("Nebyl vygenerován žádný obsah pro extrakci.");
      }
    } catch (e) {
      console.error("Chyba během extrakce:", e);
      showFeedback(`Chyba při extrakci informací: ${e.message}. Zkontrolujte konzoli.`, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Zpracování změny vstupu souboru pro nahrání obrázku
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showFeedback("Prosím, nahrajte soubor obrázku (PNG, JPG, atd.).", 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      fileToBase64(file).then(async base64 => {
        setImage(base64); // Uložte obrázek do stavu
        // Vyčistěte předchozí výsledky
        setGeneratedMessage('');
        setSelectedContact(null);
        showFeedback('', 'info'); // Vyčistit zprávu

        // Volání funkce extrakce
        const extracted = await extractProfileInfo(base64, additionalData);
        if (extracted) {
          setModalContactData(extracted); // Naplnění modálního okna extrahovanými daty
          setShowExtractionModal(true); // Zobrazení modálního okna
          showFeedback('Informace extrahovány. Před uložením zkontrolujte a upravte.', 'info');
        } else {
          showFeedback('Nepodařilo se extrahovat informace z obrázku.', 'error');
        }
      }).catch(error => {
        console.error("Chyba při konverzi obrázku na Base64:", error);
        showFeedback("Nepodařilo se nahrát obrázek.", 'error');
      });
    }
  };

  // Funkce pro generování zprávy pomocí AI
  const generateMessage = async (inputPrompt, currentAdditionalData, contactData) => {
    setLoading(true);
    showFeedback('', 'info'); // Vyčistit zprávu
    setGeneratedMessage('');

    if (!contactData || !contactData.name) {
      showFeedback("Pro generování zprávy musí být vybrán nebo extrahován a uložen kontakt.", 'error');
      setLoading(false);
      return;
    }

    try {
      let parts = [];
      let fullPrompt = `Jste prodejní asistent specializovaný na B2B oslovování.
            Váš úkol je vygenerovat personalizovanou oslovovací zprávu vhodnou pro LinkedIn nebo e-mail,
            založenou na poskytnutých informacích o kontaktu a specifickém požadavku uživatele.
            Zpráva by měla být profesionální, uctivá a jasně uvádět účel oslovení neagresivním způsobem.

            Informace o kontaktu: Jméno: ${contactData.name || 'N/A'}, Pozice: ${contactData.title || 'N/A'}, Společnost: ${contactData.company || 'N/A'}, Lokace: ${contactData.location || 'N/A'}, Nedávná aktivita: ${contactData.recentActivity || 'N/A'}, Důvod kontaktu: ${contactData.contactReason || 'N/A'}.
            ${inputPrompt ? `Specifický požadavek uživatele: "${inputPrompt}".` : ''}
            ${currentAdditionalData ? `Doplňující kontext nebo CRM data: "${currentAdditionalData}".` : ''}
            Vygenerujte pouze text personalizované oslovovací zprávy.`;

      parts.push({ text: fullPrompt });

      const payload = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          responseMimeType: "text/plain"
        }
      };

      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Chyba API během generování zprávy: ${response.status} - ${errorData.error?.message || 'Neznámá chyba'}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        setGeneratedMessage(result.candidates[0].content.parts[0].text);
        showFeedback('Zpráva úspěšně vygenerována!', 'success');
      } else {
        showFeedback("Nebyl vygenerován žádný obsah zprávy. Zkuste to prosím znovu.", 'error');
      }
    } catch (e) {
      console.error("Chyba při generování zprávy:", e);
      showFeedback(`Chyba při generování zprávy: ${e.message}. Zkontrolujte konzoli pro detaily.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Zpracování generování zprávy (pouze pokud je vybrán kontakt)
  const handleGenerateMessage = () => {
    if (selectedContact) {
      generateMessage(prompt, additionalData, selectedContact);
    } else {
      showFeedback("Prosím, vyberte uložený kontakt pro generování zprávy, nebo nejprve nahrajte obrázek a uložte nový kontakt.", 'error');
    }
  };

  // Zpracování ukládání dat z modálního okna do Firestore (vytvoření nebo aktualizace)
  const handleSaveModalData = async () => {
    if (!db || !userId) {
      showFeedback("Firestore není připraven nebo uživatel není ověřen. Nelze uložit kontakt.", 'error');
      return;
    }
    if (!modalContactData.name) {
      showFeedback("Jméno kontaktu je povinné k uložení.", 'error');
      return;
    }

    setLoading(true);
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const contactsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/contacts`);

      if (modalContactData.id) {
        // Aktualizace existujícího kontaktu
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/contacts`, modalContactData.id);
        await updateDoc(docRef, {
          name: modalContactData.name,
          title: modalContactData.title,
          company: modalContactData.company,
          location: modalContactData.location,
          recentActivity: modalContactData.recentActivity,
          contactReason: modalContactData.contactReason,
          // Timestamp se při aktualizaci nemění
        });
        showFeedback("Kontakt úspěšně aktualizován!", 'success');
        setSelectedContact(prev => ({ ...prev, ...modalContactData })); // Aktualizovat vybraný kontakt
      } else {
        // Vytvoření nového kontaktu
        const docRef = await addDoc(contactsCollectionRef, {
          ...modalContactData,
          timestamp: Timestamp.now()
        });
        showFeedback("Kontakt úspěšně uložen!", 'success');
        setSelectedContact({ id: docRef.id, ...modalContactData }); // Nastavit nově uložený kontakt jako vybraný
      }

      setShowExtractionModal(false); // Zavřít modální okno
      setModalContactData({ id: null, name: '', title: '', company: '', location: '', recentActivity: '', contactReason: '' }); // Vyčistit data modálního okna
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Vyčistit vstup souboru
      }
      setImage(null); // Vyčistit obrázek po uložení/aktualizaci
    } catch (e) {
      console.error("Chyba při ukládání/aktualizaci kontaktu z modálního okna:", e);
      showFeedback(`Nepodařilo se uložit/aktualizovat kontakt: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Zpracování změny vstupů v modálním okně
  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    setModalContactData(prev => ({ ...prev, [name]: value }));
  };

  // Zrušení extrakce/modálního okna
  const handleCancelModal = () => {
    setShowExtractionModal(false);
    setModalContactData({ id: null, name: '', title: '', company: '', location: '', recentActivity: '', contactReason: '' });
    setImage(null); // Vyčistit obrázek, protože data nebyla uložena
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Vyčistit vstup souboru
    }
    showFeedback('Úpravy zrušeny. Žádné změny kontaktu nebyly uloženy.', 'info');
  };

  // Zpracování výběru uloženého kontaktu ze seznamu (otevře modal pro editaci)
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setModalContactData({ ...contact }); // Předvyplnit modal daty vybraného kontaktu
    setShowExtractionModal(true); // Otevřít modal pro editaci
    setGeneratedMessage(''); // Vyčistit vygenerovanou zprávu, aby se generovala nová

    // Předvyplnit prompt informacemi z vybraného kontaktu
    setPrompt(`Generovat zprávu pro ${contact.name} z ${contact.company || 'jejich společnosti'} s pozicí ${contact.title || 'N/A'}. Důvod kontaktu: ${contact.contactReason || 'N/A'}.`);

    // AdditionalData ponechte, aby uživatel mohl přidat další kontext
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Vyčistěte vstup souboru
    }
    showFeedback(`Kontakt "${contact.name}" vybrán. Nyní můžete upravit jeho detaily nebo generovat zprávu.`, 'info');
  };

  // Funkce pro otevření modálního okna potvrzení smazání
  const confirmDeleteContact = (contact) => {
    setContactToDelete(contact);
    setShowDeleteConfirmModal(true);
  };

  // Zpracování mazání uloženého kontaktu z Firestore (voláno z modálního okna)
  const handleDeleteContactConfirmed = async () => {
    if (!db || !userId || !contactToDelete) {
      showFeedback("Firestore není připraven nebo uživatel není ověřen, nebo není vybrán kontakt ke smazání.", 'error');
      return;
    }

    setLoading(true);
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const contactDocRef = doc(db, `artifacts/${appId}/users/${userId}/contacts`, contactToDelete.id);
      await deleteDoc(contactDocRef);
      showFeedback("Kontakt úspěšně smazán!", 'success');
      if (selectedContact && selectedContact.id === contactToDelete.id) {
        setSelectedContact(null);
        setGeneratedMessage('');
        setImage(null);
        setPrompt('');
        setAdditionalData('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      setContactToDelete(null); // Vyčistit po smazání
      setShowDeleteConfirmModal(false); // Zavřít modální okno
    } catch (e) {
      console.error("Chyba při mazání kontaktu:", e);
      showFeedback(`Nepodařilo se smazat kontakt: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Zrušení potvrzení smazání
  const cancelDeleteContact = () => {
    setContactToDelete(null);
    setShowDeleteConfirmModal(false);
    showFeedback("Smazání kontaktu bylo zrušeno.", 'info');
  };

  // Vyčistí všechny vstupy formuláře a vygenerovaný obsah
  const handleClearForm = () => {
    setImage(null);
    setPrompt('');
    setAdditionalData('');
    setGeneratedMessage('');
    showFeedback('Formulář byl vyčištěn.', 'info');
    setSelectedContact(null);
    setModalContactData({ id: null, name: '', title: '', company: '', location: '', recentActivity: '', contactReason: '' });
    setShowExtractionModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Vrací Tailwind CSS třídy na základě typu zprávy
  const getMessageClasses = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'info':
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  // Stav načítání pro inicializaci Firebase
  if (loadingFirebase) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500"></div>
          <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500 delay-75"></div>
          <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500 delay-150"></div>
          <p className="text-gray-700">Načítání aplikace...</p>
        </div>
      </div>
    );
  }

  // Chybový stav pro inicializaci Firebase
  if (firebaseError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 p-4">
        <p className="text-red-700 font-semibold">Chyba inicializace: {firebaseError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 font-sans text-gray-800">
      {/* Tailwind CSS CDN pro stylování */}
      <script src="https://cdn.tailwindcss.com"></script>
      {/* Google Fonts - Inter pro moderní typografii */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Vlastní posuvník pro lepší estetiku */
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e0; /* gray-300 */
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #a0aec0; /* gray-400 */
                }
                .custom-file-input::-webkit-file-upload-button {
                    visibility: hidden;
                }
                .custom-file-input::before {
                    content: 'Vybrat soubor';
                    display: inline-block;
                    background: linear-gradient(to right, #6366f1, #8b5cf6); /* Indigo na fialovou gradient */
                    color: white;
                    border: none;
                    border-radius: 0.5rem; /* rounded-lg */
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    font-weight: 600;
                    text-align: center;
                    transition: all 0.2s ease-in-out;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .custom-file-input:hover::before {
                    background: linear-gradient(to right, #4f46e5, #7c3aed);
                    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
                }
                .custom-file-input:active::before {
                    background: linear-gradient(to right, #4338ca, #6d28d9);
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .contact-card.selected {
                    border-color: #3b82f6; /* blue-500 */
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); /* blue-500 s průhledností */
                }
                `}
      </style>

      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6 sm:p-8 space-y-8 border border-gray-200">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-blue-700 mb-6">
          AI LinkedIn Asistent
        </h1>

        {/* Zobrazení ID uživatele */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 text-center">
          Váš uživatelský ID: <span className="font-mono break-all">{userId}</span>
        </div>

        {/* Zpětná vazba zpráv */}
        {messageFeedback && (
          <div className={`${getMessageClasses()} px-4 py-3 rounded relative text-center shadow-sm`}>
            <span className="block sm:inline">{messageFeedback}</span>
          </div>
        )}

        {/* Hlavní obsahová oblast - rozložení jednoho sloupce */}
        <div className="flex flex-col gap-6">
          {/* Sekce vstupu a generování */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Extrakce a Generování zpráv</h2>

            {/* Nahrání obrázku */}
            <div>
              <label htmlFor="linkedinImage" className="block text-sm font-medium text-gray-700 mb-1">
                Nahrajte snímek LinkedIn profilu:
              </label>
              <input
                type="file"
                id="linkedinImage"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="custom-file-input w-full p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                (Po nahrání se zobrazí okno pro kontrolu extrahovaných informací.)
              </p>
            </div>

            {/* Specifický prompt (používá se pro generování zprávy) */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                Specifický požadavek na zprávu:
              </label>
              <textarea
                id="prompt"
                rows="3"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Např. 'Představit náš nový produkt X.'"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              ></textarea>
            </div>

            {/* Doplňující data (používá se pro extrakci i generování) */}
            <div>
              <label htmlFor="additionalData" className="block text-sm font-medium text-gray-700 mb-1">
                Doplňující CRM data (pro extrakci a generování zprávy):
              </label>
              <textarea
                id="additionalData"
                rows="3"
                value={additionalData}
                onChange={(e) => setAdditionalData(e.target.value)}
                placeholder="Např. 'Jméno: Jan Novák, Společnost: ABC s.r.o., Důvod kontaktu: Potenciální klient z veletrhu.'"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              ></textarea>
            </div>

            {/* Tlačítko Generovat Zprávu */}
            <button
              onClick={handleGenerateMessage}
              disabled={loading || !selectedContact} // Tlačítko aktivní pouze po výběru kontaktu
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generování zprávy...
                </>
              ) : 'Generovat zprávu'}
            </button>
            <button
              onClick={handleClearForm}
              className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-150 ease-in-out shadow-md"
            >
              Vyčistit formulář
            </button>
          </div>

          {/* Sekce generovaného výstupu (jen zpráva) */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Vygenerovaná zpráva</h2>
            {generatedMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-green-700 mb-2">Personalizovaná zpráva:</h3>
                <textarea
                  className="w-full h-48 p-3 border border-green-300 rounded-lg bg-white text-gray-800 resize-none"
                  readOnly
                  value={generatedMessage}
                ></textarea>
                {/* Tlačítko Kopírovat do schránky */}
                <button
                  onClick={() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = generatedMessage;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showFeedback('Zpráva zkopírována do schránky!', 'success');
                  }}
                  className="mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-150 ease-in-out shadow-md"
                >
                  Kopírovat zprávu
                </button>
              </div>
            )}
            {/* ODSTRANĚNO: Zobrazení vybraného kontaktu zde */}
          </div>
        </div>

        {/* Sekce uložených kontaktů */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Moje uložené kontakty ({savedContacts.length})</h2>
          {savedContacts.length === 0 ? (
            <p className="text-gray-500 text-center">Zatím nemáte žádné uložené kontakty.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedContacts.map(contact => (
                <div
                  key={contact.id}
                  className={`relative bg-gray-100 border rounded-lg p-4 shadow-sm
                                        ${selectedContact && selectedContact.id === contact.id ? 'border-blue-500 ring-2 ring-blue-300 contact-card selected' : 'border-gray-200'}
                                        hover:shadow-md transition duration-150 ease-in-out flex flex-col justify-between`}
                >
                  <div>
                    <h3 className="font-bold text-gray-900">{contact.name || 'Neznámé jméno'}</h3>
                    <p className="text-sm text-gray-700">{contact.title || 'N/A'} at {contact.company || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Uloženo: {contact.timestamp ? new Date(contact.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => handleSelectContact(contact)}
                      className="bg-blue-500 text-white py-1 px-3 rounded-full text-xs font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Vybrat
                    </button>
                    <button
                      onClick={() => confirmDeleteContact(contact)} // Volá nové potvrzovací okno
                      className="bg-red-500 text-white py-1 px-3 rounded-full text-xs font-semibold hover:bg-red-600 transition-colors"
                    >
                      Smazat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modální okno pro extrakci/editaci informací */}
      {showExtractionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-2xl font-bold text-blue-700 text-center mb-4">
              {modalContactData.id ? 'Upravit Kontakt' : 'Zkontrolovat a Uložit Kontakt'}
            </h2>
            <p className="text-gray-700 text-sm text-center mb-4">
              {modalContactData.id ? 'Zkontrolujte a upravte detaily kontaktu.' : 'AI extrahovala následující informace. Před uložením je prosím zkontrolujte a případně upravte.'}
            </p>

            {Object.keys(modalContactData).filter(key => key !== 'id' && key !== 'timestamp').map((key) => (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-gray-700 capitalize">
                  {key === 'name' ? 'Jméno' :
                    key === 'title' ? 'Pozice' :
                      key === 'company' ? 'Společnost' :
                        key === 'location' ? 'Lokace' :
                          key === 'recentActivity' ? 'Nedávná aktivita' :
                            key === 'contactReason' ? 'Důvod kontaktu' : key}:
                </label>
                <input
                  type="text"
                  id={key}
                  name={key}
                  value={modalContactData[key] || ''}
                  onChange={handleModalInputChange}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelModal}
                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition duration-150 ease-in-out"
              >
                Zrušit
              </button>
              <button
                onClick={handleSaveModalData}
                disabled={loading || !modalContactData.name}
                className="bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (modalContactData.id ? 'Uložit Změny' : 'Uložit Kontakt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modální okno pro potvrzení smazání */}
      {showDeleteConfirmModal && contactToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center space-y-4">
            <h2 className="text-xl font-bold text-red-700 mb-2">Potvrzení smazání</h2>
            <p className="text-gray-700">
              Opravdu chcete smazat kontakt <strong className="font-semibold">{contactToDelete.name}</strong>? Tuto akci nelze vrátit zpět.
            </p>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={cancelDeleteContact}
                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition duration-150 ease-in-out"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeleteContactConfirmed}
                disabled={loading}
                className="bg-red-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
