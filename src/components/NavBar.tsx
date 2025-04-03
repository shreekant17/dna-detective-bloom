
import React from 'react';
import { Dna } from 'lucide-react';

const NavBar: React.FC = () => {
  return (
    <header className="bg-dna-blue text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Dna className="h-6 w-6 text-dna-green" />
          <h1 className="text-xl font-bold">DNA Detective</h1>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li><a href="#" className="hover:text-dna-green transition-colors">Home</a></li>
            <li><a href="#about" className="hover:text-dna-green transition-colors">About</a></li>
            <li><a href="#analyze" className="hover:text-dna-green transition-colors">Analyze</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
