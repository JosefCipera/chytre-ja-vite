// Aplikace bude spravována Reactem
// Tento soubor app.js bude zjednodušen a nebude obsahovat logiku SpeechRecognition
// ani komplexní interakci s mikrofonem.

document.addEventListener('DOMContentLoaded', () => {
  console.log('app.js loaded: DOMContentLoaded');

  const microphoneIcon = document.getElementById('microphoneIcon');
  const statusElement = document.getElementById('status');
  const outputElement = document.getElementById('output');
  const userInputElement = document.getElementById('userInput');
  const processButton = document.querySelector('.input-section button'); // Přesnější selektor

  // Základní placeholder pro status a výstup
  if (statusElement) {
    statusElement.textContent = "Aplikace se načítá...";
  }
  if (outputElement) {
    outputElement.innerHTML = '<span class="output-text">"Zde se zobrazí odpověď z React aplikace."</span>';
  }

  // Odstraníme kompletní SpeechRecognition logiku
  // Mikrofonní ikona a tlačítko pro zadání textu budou nyní jen vizuální
  // a jejich funkčnost bude plně spravována React aplikací.

  if (microphoneIcon) {
    microphoneIcon.addEventListener('click', () => {
      console.log('Microphone icon clicked (dummy functionality)');
      if (statusElement) {
        statusElement.textContent = "Mikrofon kliknut - čeká se na React.";
      }
      // Žádná aktivní logika zde, protože to bude řídit React
    });
  }

  if (processButton) {
    processButton.addEventListener('click', () => {
      const command = userInputElement ? userInputElement.value : '';
      console.log(`Text command submitted (dummy functionality): ${command}`);
      if (outputElement) {
        outputElement.innerHTML = `<span class="output-text">"Zpracování příkazu z textu: '${command}' (přes React)."</span>`;
      }
      if (statusElement) {
        statusElement.textContent = "Příkaz odeslán - čeká se na React.";
      }
      // Žádná aktivní logika zde, protože to bude řídit React
    });
  }

  // PWA instalace (ponecháno, pokud je to relevantní pro samostatnou PWA instalaci)
  let deferredPrompt;
  const installButton = document.getElementById('install-button');

  if (installButton) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installButton.style.display = 'block';
      installButton.textContent = 'Nainstalovat aplikaci';
    });

    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        installButton.style.display = 'none';
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
  });

  // Export processCommand pro případ, že je volán z HTML (kvůli onclick atributu)
  // V budoucnu by se mělo refaktorovat, aby se předešlo globálním funkcím.
  window.processCommand = () => {
    if (userInputElement && processButton) {
      processButton.click(); // Spustí click event na tlačítku, které jsme už ošetřili
    }
  };
});
