/**
 * Game Boy Style Dialog System
 * Provides pixelated black and white dialogs for alerts and confirmations
 */

export class GameBoyDialog {
  private static instance: GameBoyDialog;
  
  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): GameBoyDialog {
    if (!GameBoyDialog.instance) {
      GameBoyDialog.instance = new GameBoyDialog();
    }
    return GameBoyDialog.instance;
  }

  private setupEventListeners(): void {
    // Alert dialog
    const alertOkBtn = document.getElementById('alert-ok-btn');
    if (alertOkBtn) {
      alertOkBtn.addEventListener('click', () => this.hideAlert());
    }

    // Confirmation dialog
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');
    
    if (confirmYesBtn) {
      confirmYesBtn.addEventListener('click', () => this.handleConfirm(true));
    }
    
    if (confirmNoBtn) {
      confirmNoBtn.addEventListener('click', () => this.handleConfirm(false));
    }
  }

  /**
   * Show a Game Boy style alert dialog
   */
  public showAlert(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.getElementById('alert-overlay');
      const titleElement = document.getElementById('alert-title');
      const textElement = document.getElementById('alert-text');
      
      if (overlay && titleElement && textElement) {
        titleElement.textContent = title.toUpperCase();
        textElement.textContent = message.toUpperCase();
        overlay.style.display = 'flex';
        
        // Store resolve function for later use
        (overlay as any).resolve = resolve;
      }
    });
  }

  /**
   * Hide the alert dialog
   */
  private hideAlert(): void {
    const overlay = document.getElementById('alert-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      if ((overlay as any).resolve) {
        (overlay as any).resolve();
        delete (overlay as any).resolve;
      }
    }
  }

  /**
   * Show a Game Boy style confirmation dialog
   */
  public showConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-overlay');
      const titleElement = document.getElementById('confirm-title');
      const textElement = document.getElementById('confirm-text');
      
      if (overlay && titleElement && textElement) {
        titleElement.textContent = title.toUpperCase();
        textElement.textContent = message.toUpperCase();
        overlay.style.display = 'flex';
        
        // Store resolve function for later use
        (overlay as any).resolve = resolve;
      }
    });
  }

  /**
   * Handle confirmation dialog result
   */
  private handleConfirm(result: boolean): void {
    const overlay = document.getElementById('confirm-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      if ((overlay as any).resolve) {
        (overlay as any).resolve(result);
        delete (overlay as any).resolve;
      }
    }
  }

  /**
   * Show a Game Boy style notification (auto-dismisses)
   */
  public showNotification(message: string, duration: number = 3000): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'gameboy-notification';
    notification.textContent = message.toUpperCase();
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#ffffff',
      border: '3px solid #000000',
      padding: '12px 16px',
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '8px',
      color: '#000000',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      zIndex: '2000',
      boxShadow: '4px 4px 0px #000000',
      maxWidth: '300px',
      wordWrap: 'break-word',
      imageRendering: 'pixelated',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out'
    });

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto-dismiss
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  /**
   * Add pixelated typing effect to text
   */
  public typeText(element: HTMLElement, text: string, speed: number = 50): Promise<void> {
    return new Promise((resolve) => {
      element.textContent = '';
      let index = 0;
      
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          element.textContent += text[index];
          index++;
        } else {
          clearInterval(typeInterval);
          resolve();
        }
      }, speed);
    });
  }

  /**
   * Add Game Boy screen scan line effect
   */
  public addScanLineEffect(): void {
    const overlay = document.getElementById('question-overlay');
    if (overlay) {
      overlay.classList.add('gameboy-screen');
    }
  }

  /**
   * Remove Game Boy screen scan line effect
   */
  public removeScanLineEffect(): void {
    const overlay = document.getElementById('question-overlay');
    if (overlay) {
      overlay.classList.remove('gameboy-screen');
    }
  }
}

// Export a singleton instance for easy use
export const gameBoyDialog = GameBoyDialog.getInstance();
