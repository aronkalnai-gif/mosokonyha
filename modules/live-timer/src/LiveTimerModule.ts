import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class LiveTimerModule extends NativeModule<{}> {
  show(id: number, title: string, body: string, endsAtMs: number, removeAtEnd: boolean): boolean;
  cancel(id: number): void;
}

// Optional so the JS still runs where the native code isn't built in (e.g. Expo Go, web).
export default requireOptionalNativeModule<LiveTimerModule>('LiveTimer');
