# Player Data Program

A Leo program for storing and managing two-player data using records on the Aleo blockchain. This program allows players to store their `avgscore` and `miscdata` while enabling other players to read this information.

## Features

- **Record-based Storage**: Uses Aleo records to store player data privately by default
- **Data Sharing**: Players can choose to share their data publicly for others to read
- **Data Updates**: Players can update their own average scores and miscellaneous data
- **Player Comparison**: Compare average scores between two players
- **Access Control**: Only record owners can update their own data

## Record Structure

The `PlayerData` record contains:
- `owner`: Address of the player who owns this record
- `avgscore`: Player's average score (u32)
- `miscdata`: Miscellaneous data for the player (u32)
- `player_id`: Unique identifier for the player (u32)

## Available Transitions

### 1. Create Player Data
```bash
leo run create_player_data <player_id> <avgscore> <miscdata>
```
Creates a new player data record.

**Example:**
```bash
leo run create_player_data 1u32 85u32 42u32
```

### 2. Update Average Score
```bash
leo run update_avgscore <player_data_record> <new_avgscore>
```
Updates only the average score of a player.

### 3. Update Miscellaneous Data
```bash
leo run update_miscdata <player_data_record> <new_miscdata>
```
Updates only the miscellaneous data of a player.

### 4. Update Both Fields
```bash
leo run update_player_data <player_data_record> <new_avgscore> <new_miscdata>
```
Updates both average score and miscellaneous data.

### 5. Share Player Data
```bash
leo run share_player_data <player_data_record>
```
Makes player data publicly readable by returning public outputs.

### 6. Compare Players
```bash
leo run compare_avgscores <player1_data_record> <player2_data_record>
```
Compares the average scores of two players and returns the difference and who has the higher score.

### 7. Get Player Info
```bash
leo run get_player_info <player_data_record>
```
Returns the player's ID, average score, and miscellaneous data as public outputs.

## Privacy Features

- **Private by Default**: Player data is stored in records which are private to the owner
- **Selective Sharing**: Players can choose when to make their data publicly readable
- **Zero-Knowledge Proofs**: All operations are verified using ZK proofs without revealing private inputs
- **Access Control**: Built-in assertions ensure only record owners can modify their data

## Usage Examples

### Creating Two Players
```bash
# Player 1
leo run create_player_data 1u32 85u32 100u32

# Player 2  
leo run create_player_data 2u32 92u32 200u32
```

### Updating Player Data
```bash
# Update player 1's average score to 90
leo run update_avgscore "{owner: aleo1..., avgscore: 85u32.private, miscdata: 100u32.private, player_id: 1u32.private, _nonce: ...}" 90u32
```

### Sharing Data for Others to Read
```bash
leo run share_player_data "{owner: aleo1..., avgscore: 85u32.private, miscdata: 100u32.private, player_id: 1u32.private, _nonce: ...}"
```

### Comparing Players
```bash
leo run compare_avgscores "{player1_record}" "{player2_record}"
```

## Building and Testing

```bash
# Build the program
leo build

# Run tests
leo test

# Execute with proving
leo execute create_player_data 1u32 85u32 42u32
```

## Integration with Gaming Applications

This program is designed to work with gaming applications where:
- `avgscore` could represent a player's average game score
- `miscdata` could store additional game-related information like level, achievements, etc.
- Players can compete by comparing their scores
- Game results can be updated while maintaining privacy

## Security Considerations

- Only record owners can update their own data (enforced by `assert_eq`)
- All transitions generate zero-knowledge proofs for verification
- Private data remains encrypted until explicitly shared
- Public sharing is opt-in through the `share_player_data` transition

## Network Deployment

To deploy this program to the Aleo testnet:

1. Set your private key in `.env`
2. Fund your account from the [Aleo faucet](https://faucet.aleo.org/)
3. Deploy using: `leo deploy`

---

*This program demonstrates the power of Aleo's privacy-preserving smart contracts, allowing players to store and selectively share their gaming data while maintaining cryptographic privacy guarantees.* 