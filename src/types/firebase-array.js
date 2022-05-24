//@flow
import type { FirebaseTypeOptions } from "./firebase-type";

import FirebaseType from "./firebase-type";

export type FirebaseArrayData = Array<FirebaseType>;

export type FirebaseArrayOptions = FirebaseTypeOptions & {
  data?: FirebaseArrayData,
};

const _ = require("lodash");

export default class FirebaseArray extends FirebaseType {
  data: FirebaseArrayData;
  constructor(
    data: FirebaseArrayData,
    options: $Shape<FirebaseTypeOptions> = {}
  ) {
    options.data = data;
    super(options);
    this.data = data;
  }
  static _new(options: FirebaseTypeOptions): this {
    return new this(_.cloneDeep(options.data ?? []), options);
  }
  static _isType(value: any): boolean {
    return Array.isArray(value);
  }
  _validateDefault(): boolean {
    const value = this._options.default;
    return true;
  }
  override(
    data: FirebaseArrayData,
    options: $Shape<FirebaseTypeOptions> = {}
  ): this {
    options.data = data;
    return super.overrideOptions(options);
  }
  _validateValue(value: any): boolean {
    if (!this.constructor._isType(value)) {
      return this._validateUndefinded(value);
    }
    const array = (value: Array<any>);
    for (let i = 0; i < array.length; i++) {
      const value = array[i];
      if (!this.data.some((type) => type.validate(value))) {
        return this._validateUndefinded(value);
      }
    }
    return true;
  }
}
