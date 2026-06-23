/**
 * MapLifecycle - Lifecycle Management
 * 
 * Manages the strict lifecycle of the map instance.
 * Ensures map only initializes in the correct sequence.
 */

import { MapEvents, MapEventTypes } from './MapEvents';

export enum LifecycleState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  LOADING_TILES = 'loading_tiles',
  WAITING_IDLE = 'waiting_idle',
  READY = 'ready',
  DESTROYED = 'destroyed',
}

export class MapLifecycle {
  private state: LifecycleState;
  private events: MapEvents;

  constructor(events: MapEvents) {
    this.state = LifecycleState.IDLE;
    this.events = events;
  }

  /**
   * Get current lifecycle state
   */
  getState(): LifecycleState {
    return this.state;
  }

  /**
   * Initialize map lifecycle
   * This is called by MapEngine.attach()
   */
  async initialize(
    createMapFn: () => google.maps.Map,
    container: HTMLElement
  ): Promise<google.maps.Map> {
    if (this.state !== LifecycleState.IDLE) {
      throw new Error(`MapLifecycle: Cannot initialize from state ${this.state}`);
    }

    this.state = LifecycleState.INITIALIZING;
    console.log('[MapLifecycle] State: INITIALIZING');

    // Create map
    const map = createMapFn();
    this.state = LifecycleState.LOADING_TILES;
    console.log('[MapLifecycle] State: LOADING_TILES');

    // Wait for tilesloaded
    await new Promise<void>((resolve) => {
      window.google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        console.log('[MapLifecycle] Tiles loaded');
        this.events.emit('TILES_LOADED', undefined);
        this.state = LifecycleState.WAITING_IDLE;
        console.log('[MapLifecycle] State: WAITING_IDLE');
        resolve();
      });
    });

    // Wait for idle
    await new Promise<void>((resolve) => {
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log('[MapLifecycle] Map idle');
        this.events.emit('IDLE', undefined);
        this.state = LifecycleState.READY;
        console.log('[MapLifecycle] State: READY');
        this.events.emit('MAP_READY', undefined);
        resolve();
      });
    });

    return map;
  }

  /**
   * Destroy lifecycle
   */
  destroy(): void {
    this.state = LifecycleState.DESTROYED;
    console.log('[MapLifecycle] State: DESTROYED');
    this.events.emit('MAP_DESTROYED', undefined);
  }

  /**
   * Reset lifecycle (for testing only)
   */
  reset(): void {
    this.state = LifecycleState.IDLE;
    console.log('[MapLifecycle] State: IDLE (reset)');
  }
}
