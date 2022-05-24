//@flow
import type { FirebaseTypeOptions } from "./firebase-type";

import FirebaseType from "./firebase-type";

export type FirebaseMapData = { [key: string]: FirebaseType };

export type FirebaseMapOptions = FirebaseTypeOptions & {
  data?: FirebaseMapData,
};

const _ = require("lodash");

export default class FirebaseMap extends FirebaseType {
  data: FirebaseMapData;
  constructor(data: FirebaseMapData, options: $Shape<FirebaseMapOptions> = {}) {
    options.data = data;
    options.default = undefined;
    super(options);
    this.data = data;
  }
  static _new(options: FirebaseTypeOptions): this {
    return new this(_.cloneDeep(options.data ?? {}), options);
  }
  static _isType(value: any): boolean {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
  }
  default(): {} {
    return {};
  }
  extend(data: FirebaseMapData): this {
    const current_data = _.cloneDeep(this.data);
    let options = this.options();
    for (let key in data) {
      if (key in current_data) {
        throw new Error(`Attempting to override field ${key} during extend`);
      }
      current_data[key] = data[key];
    }
    options.data = current_data;
    return this.constructor._new(options);
  }
  override(
    data: FirebaseMapData,
    options: $Shape<FirebaseMapOptions> = {}
  ): this {
    const current_data = _.cloneDeep(this.data);
    for (let key in data) {
      const type = current_data[key];
      const new_type = data[key];
      const constructor = type ? type.constructor : undefined;
      const new_constructor = new_type.constructor;
      if (constructor !== new_constructor) {
        throw new Error(
          `Attempting to override ${
            type ? type.constructor.name : `unknown field ${key}`
          } with ${new_type.constructor.name}`
        );
      }
      current_data[key] = type.overrideOptions(new_type._options);
    }
    options.data = current_data;
    return super.overrideOptions(options);
  }
  _validateMapUpdate(value: {}): boolean {
    return !Object.keys(value).some((key) => {
      const type = this.data[key];
      return !type || !type.validate(value[key], true);
    });
  }
  _validateAllKeysExist(value: {}): boolean {
    return !Object.keys(value).some((key) => !(key in this.data));
  }
  _validateValue(value: any, update: boolean = false): boolean {
    if (!this.constructor._isType(value)) {
      return this._validateUndefinded(value);
    }
    const object = (value: {});
    if (update) {
      return this._validateMapUpdate(object);
    }
    for (let key in this.data) {
      const type: FirebaseType = this.data[key];
      const exists = key in object || !type._options.required;
      if (!exists || !type.validate(object[key], update)) {
        return this._validateUndefinded(value);
      }
    }
    return this._validateAllKeysExist(object);
  }
}
