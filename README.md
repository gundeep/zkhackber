# zkhackber
🎲 Aleo Dice Betting Game [ZKDiceVeil]

![Dice Game](./assets/dice-game.png)

Based on our development session, here's what we've built:

Core Game Concept
A two-player, turn-based dice betting game built on the Aleo blockchain using React + TypeScript with realistic 3D physics.
Key Features
🎯 Physics-Based Dice Rolling
Realistic 3D dice using Three.js and OIMO physics engine
True physics simulation - dice bounce, roll, and settle naturally
Multiple dice support with accurate face detection
💰 Blockchain Betting System
Player 1 rolls dice and places a bet (10 ALEO, 50 ALEO, or custom amount)
Player 2 sees Player 1's bet and can accept or reject it
All results and bets are recorded on the Aleo blockchain

⚡ Smart Contract Integration
Custom Leo program (player_data_9810.aleo) stores:
Player scores (sum of dice)
Number of dice rolled
Bet amounts
Player IDs
Create and Update player records on-chain
Deployment directly from the web interface

Game Flow
Phase 1: Player 1's Turn
🎲 Roll dice using realistic physics
💵 Choose bet amount (10/50/custom ALEO)
📝 Deploy/Commit results to blockchain
🔄 Update records if needed
Phase 2: Player 2's Turn
👀 See Player 1's bet in a modal
✅ Accept or reject the bet
🎲 Roll dice (if accepted)
📝 Commit results to blockchain
🏆 Game complete or reset for new round

Technical Stack
Frontend: React + TypeScript + Vite
3D Graphics: Three.js + OIMO Physics
Blockchain: Aleo + Leo smart contracts
Styling: Custom CSS with modern gradients and animations