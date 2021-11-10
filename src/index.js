// @flow
const _ = require("lodash");

type FirebaseMapData = { [key: string]: FirebaseType };

type FirebaseArrayData = Array<FirebaseType>;

type FirebaseTypeOptions = {
  required: boolean,
  updatable: boolean,
  default?: any,
  data?: any,
  enum?: {},
  enum_values?: [],
};

type FirebaseMapOptions = FirebaseTypeOptions & {
  data?: FirebaseMapData,
};

type FirebaseArrayOptions = FirebaseTypeOptions & {
  data?: FirebaseArrayData,
};

const OverridableFirebaseTypeOptions: Array<$Keys<FirebaseTypeOptions>> = [
  "enum_values",
  "data",
];

interface IFirebaseType {
  validate(value: any, update: boolean): boolean;
  _options: FirebaseTypeOptions;
}

class FirebaseType implements IFirebaseType {
  _options: FirebaseTypeOptions;
  constructor(options: ?$Shape<FirebaseTypeOptions> = null) {
    options = _.cloneDeep(options ?? {});
    options.required = options.required ?? true;
    options.updatable = options.updatable ?? true;
    this._options = options;
    if (!this._validateDefault()) {
      throw new Error(
        `default value ${options.default} is not compatible with ${this.constructor.name}`
      );
    }
  }
  static _new(options: FirebaseTypeOptions): this {
    return new this(options);
  }
  static _isType(value: any): boolean {
    return true;
  }
  default(): any {
    return _.cloneDeep(this._options.default);
  }
  options(): FirebaseTypeOptions {
    return _.cloneDeep(this._options);
  }
  clone(): this {
    return this.constructor._new(this._options);
  }
  overrideOptions(options: FirebaseTypeOptions): this {
    return this.constructor._new(this._overrideOptions(options));
  }
  _validateDefault(): boolean {
    const value = this._options.default;
    return this.constructor._isType(value) || value === undefined;
  }
  _overrideOptions(override: FirebaseTypeOptions): FirebaseTypeOptions {
    const current = this.options();
    for (let option in override) {
      if (
        !OverridableFirebaseTypeOptions.includes(option) &&
        !_.isEqual(override[option], current[option])
      ) {
        throw new Error(
          `Trying to override non-overridable option '${option}' in ${this.constructor.name}`
        );
      }
      current[option] = override[option];
    }
    return current;
  }
  _validateEnum(value: any): boolean {
    let in_enum = this._options.enum
      ? Object.values(this._options.enum).includes(value)
      : true;
    let in_values = this._options.enum_values
      ? this._options.enum_values.includes(value)
      : true;
    return in_enum && in_values;
  }
  _validateValue(value: any, update: boolean = false): boolean {
    return this.constructor._isType(value) || this._validateUndefinded(value);
  }
  _validateUndefinded(value: any): boolean {
    return !this._options.required ? value === undefined : false;
  }
  _validateUpdatable(update: boolean): boolean {
    return update ? this._options.updatable : true;
  }
  validate(value: any, update: boolean = false): boolean {
    return (
      this._validateUpdatable(update) &&
      this._validateEnum(value) &&
      this._validateValue(value, update)
    );
  }
}

class FirebaseString extends FirebaseType {
  static _isType(value: any): boolean {
    return typeof value === "string";
  }
}

class FirebaseNumber extends FirebaseType {
  static _isType(value: any): boolean {
    return typeof value === "number";
  }
}

class FirebaseNull extends FirebaseType {
  static _isType(value: any): boolean {
    return value === null;
  }
}

class FirebaseBool extends FirebaseType {
  static _isType(value: any): boolean {
    return typeof value === "boolean";
  }
}

class FirebaseMap extends FirebaseType {
  data: FirebaseMapData;
  constructor(data: FirebaseMapData, options: $Shape<FirebaseMapOptions> = {}) {
    options.data = data;
    options.default = undefined;
    super(options);
    this.data = data;
  }
  static _new(options: FirebaseTypeOptions): this {
    return new this(options.data ?? {}, options);
  }
  static _isType(value: any): boolean {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
  }
  default(): {} {
    return {};
  }
  override(
    data: FirebaseMapData,
    options: $Shape<FirebaseMapOptions> = {}
  ): this {
    const current_data = _.cloneDeep(this.data);
    for (let key in data) {
      const type = current_data[key];
      const new_type = data[key];
      if (type.constructor !== new_type.constructor) {
        throw new Error(
          `Attempting to override ${type.constructor.name} with ${new_type.constructor.name}`
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

class FirebaseArray extends FirebaseType {
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
    return new this(options.data ?? [], options);
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

module.exports = {
  FirebaseType,
  FirebaseString,
  FirebaseNumber,
  FirebaseBool,
  FirebaseNull,
  FirebaseMap,
  FirebaseArray,
};
