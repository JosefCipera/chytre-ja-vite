import React from 'react';

// Jednoduchá komponenta Marketplace pro testování importu
function Marketplace() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-lg rounded-xl">
        <h1 className="text-3xl font-bold text-gray-800">Vítejte v Marketplace!</h1>
        <p className="mt-4 text-gray-600">Pokud vidíte tuto zprávu, import funguje správně.</p>
      </div>
    </div>
  );
}

// Ujistěte se, že komponenta je defaultně exportována
export default Marketplace;
