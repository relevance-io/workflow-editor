export class EventBus {
  private listeners: Record<string, Array<(...args: any[]) => void>>;

  constructor() {
    this.listeners = {};
  }

  public on(eventName: string, callback: (...args: any[]) => void): this {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    return this;
  }

  public off(eventName: string, callback: (...args: any[]) => void): this {
    if (!this.listeners[eventName]) {
      return this;
    }
    this.listeners[eventName] = this.listeners[eventName].filter(
      (fn) => fn !== callback,
    );
    return this;
  }

  public emit(eventName: string, ...args: any[]): this {
    (this.listeners[eventName] || []).forEach((fn) => fn(...args));
    return this;
  }
}
