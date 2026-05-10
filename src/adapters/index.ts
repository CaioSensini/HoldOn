/**
 * Service locator central. Tudo que é "externo" passa por aqui.
 * Para portar pra Capacitor, basta trocar as instâncias concretas.
 */

import type { IAdsProvider } from './IAdsProvider';
import type { IHaptics } from './IHaptics';
import type { IIAPProvider } from './IIAPProvider';
import type { IStorage } from './IStorage';

import { LocalStorageAdapter } from './LocalStorageAdapter';
import { MockAdsProvider } from './MockAdsProvider';
import { MockIAPProvider } from './MockIAPProvider';
import { WebHaptics } from './WebHaptics';

export interface Services {
  storage: IStorage;
  ads: IAdsProvider;
  iap: IIAPProvider;
  haptics: IHaptics;
}

let services: Services | null = null;

export function initServices(): Services {
  if (services) return services;
  services = {
    storage: new LocalStorageAdapter('float:'),
    ads: new MockAdsProvider(),
    iap: new MockIAPProvider(),
    haptics: new WebHaptics()
  };
  // TODO: ao portar pra Capacitor, trocar por:
  //   storage: new CapacitorStorageAdapter()
  //   ads: new AdMobAdsProvider()
  //   iap: new CapacitorIAPProvider()
  //   haptics: new CapacitorHaptics()
  return services;
}

export function getServices(): Services {
  if (!services) throw new Error('Services não inicializados — chame initServices() em main.ts.');
  return services;
}

export type { IAdsProvider, IHaptics, IIAPProvider, IStorage };
