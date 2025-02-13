export default `Boop - Game Rules

Setup:
- 2 players
- Each player starts with 8 Kittens of their color
- 8 Cats of each color are kept in reserve
- The game board is a 6x6 grid that starts empty

Gameplay:
1. Players take turns placing one Kitten or Cat on any empty space
2. When placing a piece, it "boops" all adjacent pieces (including diagonal):
   - Adjacent pieces move one space away from the placed piece
   - Pieces can be booped off the board and return to their owner's pool
   - Booped pieces don't cause chain reactions
   - When two adjacent pieces are already in a line, a piece played into that line cannot push them
   - However, pieces in a line can still be booped from other directions

Special Rules:
- Cats can boop both Cats and Kittens
- Kittens cannot boop Cats
- You always have exactly 8 pieces available to play

Graduating Kittens:
- When you line up 3 pieces in a row (horizontal, vertical, or diagonal):
  - If all 3 pieces are Cats, you win immediately
  - Otherwise:
    - Remove all 3 pieces from the game
    - For each Kitten removed, add a Cat from reserve to your pool
    - Return any removed Cats to your pool
    - If multiple sets of 3 are lined up, choose which group to graduate
- If you have all 8 pieces on the board:
  - If all 8 pieces are Cats, you win immediately
  - Otherwise:
    - Graduate any one Kitten to a Cat OR
    - Return a Cat to your pool

Winning:
- Line up 3 Cats in a row OR
- Have all 8 Cats on the board at once`
