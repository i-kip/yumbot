// Telegram WebApp global type — single source of truth
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      language_code?: string;
    };
    start_param?: string;
  };
  themeParams: Record<string, string>;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  openInvoice: (url: string, cb: (status: string) => void) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};
