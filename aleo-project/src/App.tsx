import { useState } from "react";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import { AleoWorker } from "./workers/AleoWorker";
import PhysicsDiceRoll from "./components/PhysicsDiceRoll";
import playerDataProgram from "../player_data_9810/build/main.aleo?raw";

import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";
import "@demox-labs/aleo-wallet-adapter-reactui/dist/styles.css";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

const aleoWorker = AleoWorker();
function App() {
  const { publicKey, requestTransaction, requestRecordPlaintexts } = useWallet();
  const [count, setCount] = useState(0);
  const [account, setAccount] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [rollCount, setRollCount] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [lastCommittedRecord, setLastCommittedRecord] = useState<any>(null);
  const [updatingAvgScore, setUpdatingAvgScore] = useState(false);
  const [showBetPrompt, setShowBetPrompt] = useState(false);
  const [showBetAmount, setShowBetAmount] = useState(false);
  const [selectedBetAmount, setSelectedBetAmount] = useState<number | null>(null);
  const [playerNumber, setPlayerNumber] = useState(1); // 1 or 2
  const [player1Bet, setPlayer1Bet] = useState<number | null>(null);
  const [player1Record, setPlayer1Record] = useState<any>(null); // Store Player 1's on-chain record if needed
  const [isPlayer2Turn, setIsPlayer2Turn] = useState(false);
  const [showPlayer2BetModal, setShowPlayer2BetModal] = useState(false);

  const generateAccount = async () => {
    const key = await aleoWorker.getPrivateKey();
    setAccount(await key.to_string());
  };

  function handleDeployClick() {
    setShowBetPrompt(true);
  }

  async function deploy() {
    setDeploying(true);
    try {
      const result = await aleoWorker.deployProgram(playerDataProgram);
      console.log("Transaction:")
      console.log("https://explorer.provable.com/transaction/" + result)
      alert("Transaction ID: " + result + (selectedBetAmount ? `\nBet Amount: ${selectedBetAmount} ALEO` : ''));
    } catch (e) {
      console.log(e)
      alert("Error with deployment, please check console for details");
    }
    setDeploying(false);
    setSelectedBetAmount(null);
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
      if (!requestTransaction || !publicKey) {
        alert("Please connect your wallet first");
        setCommitting(false);
        return;
      }

      const avgscore = diceResults.reduce((sum, val) => sum + val, 0);
      const miscdata = diceResults.length;
      const player_id = count;
      const bet_amount = selectedBetAmount || 0;
      
      // Use wallet adapter for on-chain transaction
      const result = await requestTransaction({
        address: publicKey,
        chainId: "testnetbeta",
        transitions: [{
          program: "player_data_9810.aleo",
          functionName: "create_player_data",
          inputs: [
            `${avgscore}u32`,
            `${miscdata}u32`,
            `${player_id}u32`,
            `${bet_amount}u32`
          ]
        }],
        fee: 100000, // fees in microcredits
        feePrivate: false,
      });
      
      setCommitResult(result);
      setLastCommittedRecord(result); // Store the record for potential updates
      alert("Transaction submitted to chain! Transaction ID: " + result);

      // If Player 1, prep for Player 2
      if (playerNumber === 1) {
        setPlayer1Bet(bet_amount);
        setPlayer1Record(result); // Save record if you want Player 2 to reference it
        setPlayerNumber(2);
        setIsPlayer2Turn(true);
        setShowPlayer2BetModal(true);
        resetForNextPlayer();
      } else {
        // If Player 2, you can show results or reset for a new game
        alert("Player 2 has finished! Game over or reset as needed.");
        // Optionally reset everything for a new game:
        setPlayerNumber(1);
        setPlayer1Bet(null);
        setPlayer1Record(null);
        setIsPlayer2Turn(false);
        setShowPlayer2BetModal(false);
        resetForNextPlayer();
      }
    } catch (e) {
      alert("Error committing player results: " + e);
    }
    setCommitting(false);
  }

  async function updatePlayerRecord() {
    setUpdating(true);
    try {
      // Get current dice results for the update
      const newAvgscore = diceResults.reduce((sum, val) => sum + val, 0);
      const newMiscdata = diceResults.length;
      const newBetAmount = selectedBetAmount || 0;
      
      let result;
      
      if (lastCommittedRecord) {
        // Update existing record
        result = await aleoWorker.localProgramExecution(
          playerDataProgram,
          "update_all_player_data",
          [
            lastCommittedRecord, // The record to update
            `${newAvgscore}u32`,
            `${newMiscdata}u32`,
            `${newBetAmount}u32`
          ]
        );
        alert("Record updated successfully! Result: " + JSON.stringify(result));
      } else {
        // Create new record
        result = await aleoWorker.localProgramExecution(
          playerDataProgram,
          "create_player_data",
          [
            `${newAvgscore}u32`,
            `${newMiscdata}u32`,
            `${count}u32`,
            `${newBetAmount}u32`
          ]
        );
        alert("New record created successfully! Result: " + JSON.stringify(result));
      }
      
      setLastCommittedRecord(result); // Update the stored record
    } catch (e) {
      alert("Error with player record operation: " + e);
    }
    setUpdating(false);
  }

  async function updateAverageScore() {
    setUpdatingAvgScore(true);
    try {
      // Call update_avgscore with dummy hardcoded values
      // Function signature: update_avgscore(player_data: PlayerData, public new_avgscore: u32)
      const newAvgScore = 6; // Hardcoded dummy value
      
      // For testing, let's create a dummy record in the correct Leo format
      // This should match the PlayerData record structure from your Leo program
      const dummyRecord = `{
        owner: aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc.private,
        avgscore: 10u32.private,
        miscdata: 2u32.private,
        player_id: 1u32.private,
        bet_amount: 50u32.private,
        _nonce: 1234567890123456789012345678901234567890123456789012345678901234567890group.public
      }`;
      
      console.log("Using dummy record for testing:", dummyRecord);
      console.log("New avg score:", newAvgScore);
      
      const result = await aleoWorker.localProgramExecution(
        playerDataProgram,
        "update_avgscore",
        [
          dummyRecord, // Dummy PlayerData record in Leo format
          `${newAvgScore}u32`   // New average score (hardcoded)
        ]
      );
      
      alert(`Average score updated successfully! New score: ${newAvgScore}\nResult: ` + JSON.stringify(result));
      setLastCommittedRecord(result); // Update the stored record with the new result
    } catch (e) {
      console.error("Error details:", e);
      alert("Error updating average score: " + e);
    }
    setUpdatingAvgScore(false);
  }

  async function requestPlayerRecords() {
    if (!requestRecordPlaintexts) {
      alert("No wallet connected");
      return;
    }
    
    try {
      const records = await requestRecordPlaintexts('player_data_9810.aleo');
      const unspentRecords = records.filter(record => !record.spent);

      if (unspentRecords.length > 0) {
        console.log("Unspent Player Records:");
        unspentRecords.forEach((record, index) => {
          console.log(`Record ${index + 1}:`, record.plaintext);
        });
        alert(`Found ${unspentRecords.length} unspent player records. Check console for details.`);
      } else {
        alert("No unspent player records found");
      }
    } catch (e) {
      console.error("Error fetching records:", e);
      alert("Error fetching player records: " + e);
    }
  }

  function resetForNextPlayer() {
    setDiceResults([]);
    setRollCount(0);
    setCommitResult(null);
    setSelectedBetAmount(null);
    setCommitting(false);
  }

  return (
    <>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <WalletMultiButton />
      </div>
      <div>
        <a href="https://provable.com" target="_blank">
          <img src={aleoLogo} className="logo" alt="Aleo logo" />
        </a>
      </div>
      <h1>ZKDiceVeil</h1>
      
      {/* Physics Dice Roll Section */}
      <div className="card">
        <h2>
          {playerNumber === 1 ? "Player 1's Turn" : "Player 2's Turn"}
        </h2>
        <p>Experience true physics-based dice rolling with OIMO physics engine!</p>
        <PhysicsDiceRoll onRollComplete={handleDiceRollComplete} onRollCountChange={handleRollCountChange} />
        {/* Debug info */}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Debug: rollCount = {rollCount}, diceResults.length = {diceResults.length}
        </div>
        {/* Test button - always visible */}
        <button 
          onClick={() => alert('Test button works!')} 
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            fontSize: '14px',
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧪 Test Button (Always Visible)
        </button>
        {rollCount >= 1 && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <h3>Last Roll Results</h3>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Dice: {diceResults.join(', ')} | Total: {diceResults.reduce((sum, val) => sum + val, 0)}
            </p>
            <button onClick={commitPlayerResults} disabled={committing} style={{marginTop: '10px', padding: '10px 20px', fontSize: '16px'}}>
              {committing ? 'Committing...' : 'Commit Player Results to Chain'}
            </button>
            {rollCount >= 1 && (
              <button 
                onClick={updatePlayerRecord} 
                disabled={updating || diceResults.length === 0} 
                style={{
                  marginTop: '10px', 
                  padding: '10px 20px', 
                  fontSize: '16px',
                  background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.6 : 1
                }}
              >
                {updating ? 'Updating...' : '🔄 Update Player Record'}
              </button>
            )}
            {rollCount >= 1 && (
              <button 
                onClick={updateAverageScore} 
                disabled={updatingAvgScore} 
                style={{
                  marginTop: '10px', 
                  display: 'block',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  padding: '10px 20px', 
                  fontSize: '16px',
                  background: 'linear-gradient(90deg, #ff8c00 0%, #ffa500 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (updatingAvgScore || !lastCommittedRecord) ? 'not-allowed' : 'pointer',
                  opacity: (updatingAvgScore || !lastCommittedRecord) ? 0.6 : 1
                }}
              >
                {updatingAvgScore ? 'Updating...' : '📊 Update Average Score'}
              </button>
            )}
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
          <button onClick={requestPlayerRecords}>
            📋 Request Player Records
          </button>
        </p>
        {publicKey && (
          <p style={{ fontSize: '14px', color: '#666', wordBreak: 'break-all' }}>
            Connected wallet: {publicKey}
          </p>
        )}
        {/* Removed execute button as helloworld_program is not used */}
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
            onClick={handleDeployClick}
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
              : `🚀 Publish player 1 results On Chain`}
          </button>
        </p>
        {/* Bet Prompt Modal */}
        {showBetPrompt && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ background: '#fff', padding: 40, borderRadius: 20, minWidth: 340, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h2 style={{marginBottom: 24, color: '#222'}}>Would you like to open a bet?</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
                <button
                  onClick={() => { setShowBetPrompt(false); }}
                  style={{
                    padding: '12px 36px', fontSize: '1.15rem', borderRadius: 10, border: 'none',
                    background: '#e0e0e0', color: '#333', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#cccccc'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#e0e0e0'; }}
                >No</button>
                <button
                  onClick={() => { setShowBetPrompt(false); setShowBetAmount(true); }}
                  style={{
                    padding: '12px 36px', fontSize: '1.15rem', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #0056b3 0%, #00aaff 100%)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)'; }}
                >Yes</button>
              </div>
            </div>
          </div>
        )}
        {/* Bet Amount Modal */}
        {showBetAmount && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ background: '#fff', padding: 40, borderRadius: 20, minWidth: 380, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h2 style={{marginBottom: 24, color: '#222'}}>Choose your bet amount</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 28, alignItems: 'center' }}>
                {/* 10 ALEO Button */}
                <button
                  onClick={() => {
                    setSelectedBetAmount(10);
                    setShowBetAmount(false);
                    setTimeout(deploy, 200);
                  }}
                  style={{
                    padding: '14px 32px', fontSize: '1.2rem', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #0056b3 0%, #00aaff 100%)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)'; }}
                >
                  10 ALEO
                </button>
                {/* 50 ALEO Button */}
                <button
                  onClick={() => {
                    setSelectedBetAmount(50);
                    setShowBetAmount(false);
                    setTimeout(deploy, 200);
                  }}
                  style={{
                    padding: '14px 32px', fontSize: '1.2rem', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #0056b3 0%, #00aaff 100%)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)'; }}
                >
                  50 ALEO
                </button>
                {/* Custom ALEO Input */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min={1}
                    placeholder="Custom"
                    style={{
                      padding: '12px 16px', fontSize: '1.1rem', borderRadius: 8, border: '1.5px solid #bdbdbd', width: 100, textAlign: 'center', marginBottom: 6
                    }}
                    id="custom-aleo-input"
                  />
                  <button
                    onClick={() => {
                      const val = parseInt((document.getElementById('custom-aleo-input') as HTMLInputElement)?.value, 10);
                      if (!isNaN(val) && val > 0) {
                        setSelectedBetAmount(val);
                        setShowBetAmount(false);
                        setTimeout(deploy, 200);
                      }
                    }}
                    style={{
                      padding: '8px 18px', fontSize: '1.05rem', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #0056b3 0%, #00aaff 100%)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)'; }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="read-the-docs">
      </p>
      {showPlayer2BetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: 40, borderRadius: 20, minWidth: 340, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{marginBottom: 24, color: '#222'}}>
              Player 1 placed a bet of <span style={{color:'#007bff'}}>{player1Bet} ALEO</span>.<br/>Do you accept this bet?
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
              <button
                onClick={() => {
                  setShowPlayer2BetModal(false);
                  // Player 2 can now roll dice and commit
                }}
                style={{
                  padding: '12px 36px', fontSize: '1.15rem', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'background 0.2s',
                }}
              >Accept</button>
              <button
                onClick={() => {
                  setShowPlayer2BetModal(false);
                  setPlayerNumber(1);
                  setPlayer1Bet(null);
                  setPlayer1Record(null);
                  setIsPlayer2Turn(false);
                  resetForNextPlayer();
                  alert("Player 2 rejected the bet. Game reset.");
                }}
                style={{
                  padding: '12px 36px', fontSize: '1.15rem', borderRadius: 10, border: 'none',
                  background: '#e0e0e0', color: '#333', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >Reject</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
