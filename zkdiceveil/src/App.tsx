import { useState } from "react";
import reactLogo from "./assets/react.svg";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import helloworld_program from "../helloworld/build/main.aleo?raw";
import { AleoWorker } from "./workers/AleoWorker";
import ProfessionalDice from "./components/ProfessionalDice";

const aleoWorker = AleoWorker();
function App() {
  const [count, setCount] = useState(0);
  const [account, setAccount] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showDice, setShowDice] = useState(true);

  const generateAccount = async () => {
    const key = await aleoWorker.getPrivateKey();
    setAccount(await key.to_string());
  };

  async function execute() {
    setExecuting(true);
    const result = await aleoWorker.localProgramExecution(
      helloworld_program,
      "main",
      ["5u32", "5u32"],
    );
    setExecuting(false);

    alert(JSON.stringify(result));
  }

  async function deploy() {
    setDeploying(true);
    try {
      const result = await aleoWorker.deployProgram(helloworld_program);
      console.log("Transaction:")
      console.log("https://explorer.provable.com/transaction/" + result)
      alert("Transaction ID: " + result);
    } catch (e) {
      console.log(e)
      alert("Error with deployment, please check console for details");
    }
    setDeploying(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img src={aleoLogo} className="h-10 w-10" alt="Aleo logo" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">ZKDiceVeil</h1>
                  <p className="text-sm text-slate-600">Aleo-Powered Dice Simulator</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <a 
                href="https://provable.com" 
                target="_blank"
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Aleo Network
              </a>
              <a 
                href="https://react.dev" 
                target="_blank"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <img src={reactLogo} className="h-5 w-5" alt="React logo" />
                <span>React</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Dice Simulator - Full Screen */}
      {showDice && <ProfessionalDice onClose={() => setShowDice(false)} />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dice Simulator Button */}
        {!showDice && (
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowDice(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🎲 Open Dice Simulator
            </button>
          </div>
        )}
        
        {/* Aleo Demo Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Aleo Blockchain Integration
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <button 
                onClick={() => setCount((count) => count + 1)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Count: {count}
              </button>
              <p className="text-sm text-slate-600 mt-2">Demo Counter</p>
            </div>
            
            <div className="text-center">
              <button 
                onClick={generateAccount}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                {account ? '✓ Account Generated' : 'Generate Account'}
              </button>
              <p className="text-sm text-slate-600 mt-2">Aleo Account</p>
            </div>
            
            <div className="text-center">
              <button 
                disabled={executing} 
                onClick={execute}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                {executing ? 'Executing...' : 'Execute Program'}
              </button>
              <p className="text-sm text-slate-600 mt-2">Run Aleo Code</p>
            </div>
            
            <div className="text-center">
              <button 
                disabled={deploying} 
                onClick={deploy}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                {deploying ? 'Deploying...' : 'Deploy Contract'}
              </button>
              <p className="text-sm text-slate-600 mt-2">Blockchain Deploy</p>
            </div>
          </div>

          {account && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Generated Account:</p>
              <code className="text-xs text-slate-800 break-all">{account}</code>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">
            Built with ❤️ using Aleo, React, and Three.js
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
