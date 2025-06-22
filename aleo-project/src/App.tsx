import { useState } from "react";
import reactLogo from "./assets/react.svg";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import helloworld_program from "../helloworld/build/main.aleo?raw";
import { AleoWorker } from "./workers/AleoWorker";
import PhysicsDiceRoll from "./components/PhysicsDiceRoll";
import playerDataProgram from "../player_data/build/main.aleo?raw";

const aleoWorker = AleoWorker();
function App() {
  const [count, setCount] = useState(0);
  const [account, setAccount] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [rollCount, setRollCount] = useState(0);

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

  const handleDiceRollComplete = (results: number[]) => {
    setDiceResults(results);
    console.log(`Physics dice roll results: ${results.join(', ')}`);
  };

  const handleRollCountChange = (count: number) => {
    setRollCount(count);
  };

  async function commitPlayerResults() {
    setCommitting(true);
    try {
      // Example: avgscore = total of dice, miscdata = number of dice, player_id = count
      const avgscore = diceResults.reduce((sum, val) => sum + val, 0);
      const miscdata = diceResults.length;
      const player_id = count;
      const result = await aleoWorker.localProgramExecution(
        playerDataProgram,
        "create_player_data",
        [
          `${avgscore}u32`,
          `${miscdata}u32`,
          `${player_id}u32`
        ]
      );
      setCommitResult(result);
      alert("Committed to chain! Result: " + JSON.stringify(result));
    } catch (e) {
      alert("Error committing player results: " + e);
    }
    setCommitting(false);
  }

  return (
    <>
      <div>
        <a href="https://provable.com" target="_blank">
          <img src={aleoLogo} className="logo" alt="Aleo logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Aleo + React + Physics Dice</h1>
      
      {/* Physics Dice Roll Section */}
      <div className="card">
        <h2>🎲 Realistic Physics Dice Roll</h2>
        <p>Experience true physics-based dice rolling with OIMO physics engine!</p>
        <PhysicsDiceRoll onRollComplete={handleDiceRollComplete} onRollCountChange={handleRollCountChange} />
        {rollCount >= 1 && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <h3>Last Roll Results</h3>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Dice: {diceResults.join(', ')} | Total: {diceResults.reduce((sum, val) => sum + val, 0)}
            </p>
            <button onClick={commitPlayerResults} disabled={committing} style={{marginTop: '10px', padding: '10px 20px', fontSize: '16px'}}>
              {committing ? 'Committing...' : 'Commit Player Results to Chain'}
            </button>
            {commitResult && (
              <div style={{marginTop: '10px', fontSize: '14px', color: 'green'}}>
                Last commit result: {JSON.stringify(commitResult)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          <button onClick={generateAccount}>
            {account
              ? `Account private key is ${JSON.stringify(account)}`
              : `Click to generate account`}
          </button>
        </p>
        <p>
          <button disabled={executing} onClick={execute}>
            {executing
              ? `Executing...check console for details...`
              : `Execute helloworld.aleo`}
          </button>
        </p>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      {/* Advanced Section */}
      <div className="card">
        <h2>Advanced Actions</h2>
        <p>
          Deployment on Aleo requires certain prerequisites like seeding your
          wallet with credits and retrieving a fee record. Check README for more
          details.
        </p>
        <p>
          <button
            disabled={deploying}
            onClick={deploy}
            style={{
              padding: '18px 40px',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              borderRadius: '12px',
              background: deploying
                ? 'linear-gradient(90deg, #bdbdbd 0%, #e0e0e0 100%)'
                : 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)',
              color: deploying ? '#666' : '#fff',
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              cursor: deploying ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s, transform 0.2s',
              margin: '20px 0',
            }}
            onMouseOver={e => {
              if (!deploying) (e.currentTarget.style.background = 'linear-gradient(90deg, #0056b3 0%, #00aaff 100%)');
            }}
            onMouseOut={e => {
              if (!deploying) (e.currentTarget.style.background = 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)');
            }}
          >
            {deploying
              ? `Deploying...check console for details...`
              : `🚀 Deploy player 1 results`}
          </button>
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Aleo and React logos to learn more
      </p>
    </>
  );
}

export default App;
