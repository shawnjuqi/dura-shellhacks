/**
 * Game Boy Dialog System Examples
 * This file demonstrates how to use the Game Boy dialog system
 */

import { gameBoyDialog } from "./components/GameBoyDialog";

// Example usage functions - you can call these from your main game code

/**
 * Example: Show a welcome alert
 */
export function showWelcomeAlert(): void {
  gameBoyDialog.showAlert(
    "WELCOME!",
    "Welcome to the Game Boy style driving game! Use arrow keys to drive."
  );
}

/**
 * Example: Show a confirmation dialog
 */
export async function showQuitConfirmation(): Promise<boolean> {
  return await gameBoyDialog.showConfirm(
    "QUIT GAME?",
    "Are you sure you want to quit the game?"
  );
}

/**
 * Example: Show various notifications
 */
export function showGameNotifications(): void {
  // Show a success notification
  gameBoyDialog.showNotification("LEVEL COMPLETE!", 3000);
  
  // Show an info notification after a delay
  setTimeout(() => {
    gameBoyDialog.showNotification("NEW HIGH SCORE!", 3000);
  }, 1000);
  
  // Show a warning notification after another delay
  setTimeout(() => {
    gameBoyDialog.showNotification("LOW FUEL WARNING!", 3000);
  }, 2000);
}

/**
 * Example: Show a confirmation with custom actions
 */
export async function showSaveGameConfirmation(): Promise<void> {
  const shouldSave = await gameBoyDialog.showConfirm(
    "SAVE GAME?",
    "Do you want to save your progress?"
  );
  
  if (shouldSave) {
    gameBoyDialog.showNotification("GAME SAVED!", 2000);
    // Add your save game logic here
  } else {
    gameBoyDialog.showNotification("GAME NOT SAVED", 2000);
  }
}

/**
 * Example: Show an error alert
 */
export function showErrorAlert(errorMessage: string): void {
  gameBoyDialog.showAlert(
    "ERROR",
    `Something went wrong: ${errorMessage}`
  );
}

/**
 * Example: Show a game over dialog
 */
export async function showGameOverDialog(score: number): Promise<boolean> {
  const playAgain = await gameBoyDialog.showConfirm(
    "GAME OVER",
    `Final Score: ${score}. Play Again?`
  );
  
  if (playAgain) {
    gameBoyDialog.showNotification("STARTING NEW GAME...", 2000);
    return true;
  } else {
    gameBoyDialog.showNotification("Thanks for playing!", 3000);
    return false;
  }
}

/**
 * Example: Show typing effect in a dialog
 */
export async function showTypingDialog(): Promise<void> {
  // This would require modifying the dialog to support typing effects
  // For now, just show a regular dialog
  await gameBoyDialog.showAlert(
    "TYPING EFFECT",
    "This could be enhanced with a typing effect for each character!"
  );
}

// You can add event listeners to buttons or call these functions directly
// For example:
// document.getElementById('save-btn')?.addEventListener('click', showSaveGameConfirmation);
// document.getElementById('quit-btn')?.addEventListener('click', async () => {
//   const shouldQuit = await showQuitConfirmation();
//   if (shouldQuit) {
//     // Handle quit logic
//   }
// });
