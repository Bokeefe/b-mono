declare module 'pizzicato' {
  export namespace Effects {
    export class Reverb {
      time: number;
      decay: number;
      reverse: boolean;
      mix: number;
      constructor(options?: {
        time?: number;
        decay?: number;
        reverse?: boolean;
        mix?: number;
      });
    }
  }

  export class Sound {
    playing: boolean;
    volume: number;
    playbackRate: number;
    loop: boolean;
    source: any;
    masterGainNode: any;
    
    constructor(
      options: {
        source: 'file' | 'input' | 'wave' | 'noise';
        options?: {
          path?: string;
          loop?: boolean;
          [key: string]: any;
        };
      },
      callback?: (error?: Error) => void
    );

    play(): void;
    pause(): void;
    stop(): void;
    addEffect(effect: any): void;
    removeEffect(effect: any): void;
    on(event: string, callback: () => void): void;
    off(event: string, callback?: () => void): void;
  }
}

