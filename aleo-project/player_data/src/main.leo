// The 'player_data' program.
program player_data.aleo {
    
    // Record to store player data
    record PlayerData {
        // Owner of this player data record
        owner: address,
        // Player's average score
        avgscore: u32,
        // Miscellaneous data for the player
        miscdata: u32,
        // Player identifier/name (using u32 for simplicity)
        player_id: u32,
        // Bet amount for this player
        bet_amount: u32,
    }

    // Create initial player data
    transition create_player_data(
        public player_id: u32,
        public avgscore: u32,
        public miscdata: u32,
        public bet_amount: u32
    ) -> PlayerData {
        return PlayerData {
            owner: self.caller,
            avgscore: avgscore,
            miscdata: miscdata,
            player_id: player_id,
            bet_amount: bet_amount,
        };
    }

    // Update player's average score
    transition update_avgscore(
        player_data: PlayerData,
        public new_avgscore: u32
    ) -> PlayerData {
        // Ensure only the owner can update their own data
        assert_eq(player_data.owner, self.caller);
        
        return PlayerData {
            owner: player_data.owner,
            avgscore: new_avgscore,
            miscdata: player_data.miscdata,
            player_id: player_data.player_id,
            bet_amount: player_data.bet_amount,
        };
    }

    // Update player's misc data
    transition update_miscdata(
        player_data: PlayerData,
        public new_miscdata: u32
    ) -> PlayerData {
        // Ensure only the owner can update their own data
        assert_eq(player_data.owner, self.caller);
        
        return PlayerData {
            owner: player_data.owner,
            avgscore: player_data.avgscore,
            miscdata: new_miscdata,
            player_id: player_data.player_id,
            bet_amount: player_data.bet_amount,
        };
    }

    // Update both avgscore and miscdata
    transition update_player_data(
        player_data: PlayerData,
        public new_avgscore: u32,
        public new_miscdata: u32
    ) -> PlayerData {
        // Ensure only the owner can update their own data
        assert_eq(player_data.owner, self.caller);
        
        return PlayerData {
            owner: player_data.owner,
            avgscore: new_avgscore,
            miscdata: new_miscdata,
            player_id: player_data.player_id,
            bet_amount: player_data.bet_amount,
        };
    }

    // Share player data publicly (makes it readable by others)
    // This creates a public output that others can see
    transition share_player_data(
        player_data: PlayerData
    ) -> (PlayerData, u32, u32, u32, address) {
        // Ensure only the owner can share their own data
        assert_eq(player_data.owner, self.caller);
        
        // Return the record and public outputs that others can read
        return (
            player_data,
            player_data.player_id,
            player_data.avgscore,
            player_data.miscdata,
            player_data.owner
        );
    }

    // Compare two players' average scores
    transition compare_avgscores(
        player1_data: PlayerData,
        player2_data: PlayerData
    ) -> (u32, bool) {
        // Calculate the difference and determine who has higher score
        let player1_higher: bool = player1_data.avgscore >= player2_data.avgscore;
        let score_diff: u32 = player1_data.avgscore >= player2_data.avgscore ? 
            player1_data.avgscore - player2_data.avgscore : 
            player2_data.avgscore - player1_data.avgscore;
        
        return (score_diff, player1_higher);
    }

    // Get player info (returns public values for others to read)
    transition get_player_info(
        player_data: PlayerData
    ) -> (u32, u32, u32) {
        return (
            player_data.player_id,
            player_data.avgscore,
            player_data.miscdata
        );
    }
}
