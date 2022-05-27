//@flow
import type { FirebaseMapOptions, FirebaseMapData } from "./types/firebase-map";

import FirebaseMap from "./types/firebase-map";

export default class FirebaseSchema {
  _data: FirebaseMap;
  constructor(data: FirebaseMapData) {
    this._data = new FirebaseMap(data);
  }
  asFirebaseMap(options: $Shape<FirebaseMapOptions> = {}): FirebaseMap {
    return this._data.overrideOptions(options);
  }
  validate(data: {}, update: boolean = false): boolean {
    return this._data.validate(data, update);
  }
  extend(data: FirebaseMapData): this {
    let map = this._data.extend(data);
    return new this.constructor(map.data);
  }
  getFirestoreSafeData(key: string, data: any): any {
    return this._data.data[key].constructor.getFirestoreSafeData(data);
  }
}
