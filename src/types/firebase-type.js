//@flow
const _ = require("lodash");

export type FirebaseTypeOptions = {
  required: boolean,
  updatable: boolean,
  nullable: boolean,
  default?: any,
  data?: any,
  enum?: {},
  enum_values?: [],
};

export const OverridableFirebaseTypeOptions: Array<$Keys<FirebaseTypeOptions>> =
  ["enum_values", "data"];

export interface IFirebaseType {
  validate(value: any, update: boolean): boolean;
  _options: FirebaseTypeOptions;
}

export default class FirebaseType implements IFirebaseType {
  _options: FirebaseTypeOptions;
  constructor(options: ?$Shape<FirebaseTypeOptions> = null) {
    options = _.cloneDeep(options ?? {});
    options.required = options.required ?? true;
    options.updatable = options.updatable ?? true;
    options.nullable = options.nullable ?? false;
    this._options = options;
    if (!this._validateDefault()) {
      throw new Error(
        `default value ${
          options.default ?? "undefined"
        } is not compatible with ${this.constructor.name}`
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
    return (
      this.constructor._isType(value) ||
      this._validateUndefinded(value) ||
      this._validateNullable(value)
    );
  }
  _validateUndefinded(value: any): boolean {
    return !this._options.required ? value === undefined : false;
  }
  _validateNullable(value: any): boolean {
    return this._options.nullable ? value === null : false;
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
