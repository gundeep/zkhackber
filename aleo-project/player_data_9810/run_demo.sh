#!/bin/bash

echo "🎮 Player Data Program Demo"
echo "=========================="
echo

echo "📋 Building the program..."
leo build
echo

echo "🎯 Creating Player 1 data (ID: 1, AvgScore: 85, MiscData: 100)..."
leo run create_player_data 1u32 85u32 100u32
echo

echo "🎯 Creating Player 2 data (ID: 2, AvgScore: 92, MiscData: 200)..."
leo run create_player_data 2u32 92u32 200u32
echo

echo "✅ Demo completed!"
echo "📖 Check the README.md for more usage examples and detailed documentation."
echo
echo "🔗 To continue testing:"
echo "   - Copy the output records from above"
echo "   - Use them in update_avgscore, share_player_data, or compare_avgscores transitions"
echo "   - See README.md for complete examples" 