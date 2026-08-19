interface DesktopTtsHost {
  SpeakAsync(text: string, volume: number): Promise<void>;
  Stop(): Promise<void>;
}

interface Window {
  readonly __IELTS_DESKTOP__?: Readonly<{
    host: "webview2";
  }>;
  chrome?: {
    webview?: {
      hostObjects?: {
        desktopTts?: DesktopTtsHost;
      };
    };
  };
}
