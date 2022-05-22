// @flow
const _ = require("lodash");
import {
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  doc,
  collection,
  getFirestore,
  updateDoc,
  onSnapshot,
  runTransaction,
} from "@firebase/firestore";

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

class FirebaseSchema {
  _data: FirebaseMap;
  constructor(data: FirebaseMapData) {
    this._data = new FirebaseMap(data);
  }
  asFirebaseMap(options: FirebaseMapOptions = {}): FirebaseMap {
    return this._data.overrideOptions(options);
  }
  validate(data: {}, update: boolean = false): boolean {
    return this._data.validate(data, update);
  }
  extend(data: FirebaseMapData): this {
    let map = this._data.extend(data);
    return new this.constructor(map.data);
  }
}

class FirebaseModel {
  _data: {};
  id: string;
  _doc: any;
  get data(): {} {
    return _.cloneDeep(this._data);
  }
  constructor(docSnap: any) {
    if (
      !docSnap.exists() ||
      !this.constructor.validate(docSnap.data()) ||
      docSnap.ref.path !== this.constructor.docSnapPath(docSnap)
    ) {
      throw new Error(
        `provided document is not valid for ${this.constructor.name}`
      );
    }
    this._data = docSnap.data();
    this.id = docSnap.id;
    this._doc = docSnap.ref;
  }
  static docSnapPath(docSnap: any): string {
    return `${this.collectionPath(docSnap.data())}/${docSnap.id}`;
  }
  static collectionPath(data: ?{} = null): string {
    throw new Error(`implement static collectionPath() in ${this.name}`);
  }
  static modelSchema(): FirebaseSchema {
    throw new Error(`implement static modelSchema() in ${this.name}`);
  }
  static validate(data: {}, update: boolean = false): boolean {
    return this.modelSchema().validate(data, update);
  }
  static async create(data: {}, id: ?string): Promise<this> {
    if (!this.validate(data)) {
      throw new Error(
        `Invalid Fields were found in creation data for ${this.name}`
      );
    }
    let colRef = collection(getFirestore(), this.collectionPath(data));
    let docRef = null;
    if (!id) {
      docRef = await addDoc(colRef, data);
    } else {
      docRef = doc(colRef, id);
      let exists = false;
      try {
        await this.getByID(id);
        exists = true;
      } catch (e) {}
      if (exists) {
        throw new Error(`ID ${id} already exists for type ${this.name}`);
      }
      await setDoc(docRef, data);
    }
    let docSnap = await getDoc(docRef);
    return new this(docSnap);
  }
  static async getByID(id: string, data: ?{} = null): Promise<this> {
    let colRef = collection(getFirestore(), this.collectionPath(data));
    let docSnap = await getDoc(doc(colRef, id));
    return new this(docSnap);
  }
  listen(func: (data: this) => any): any {
    return new Proxy(
      onSnapshot(this._doc, (docSnap) => {
        func(new this.constructor(docSnap));
      }),
      {
        get(object, property) {
          switch (property) {
            case "stop":
              return object;
            default:
              throw new Error(`property ${property} does not exist`);
          }
        },
      }
    );
  }
  async _refreshData(): Promise<this> {
    let docSnap = await getDoc(this._doc);
    return new this.constructor(docSnap);
  }
  async set(data: ?{} = null): Promise<this> {
    data = !data ? this._data : data;
    if (!this.constructor.validate(data)) {
      throw new Error(
        `Invalid Fields were found in upsert data for ${this.constructor.name}`
      );
    }
    await setDoc(this._doc, data);
    return await this._refreshData();
  }
  async update(data: {}): Promise<this> {
    if (!this.constructor.validate(data, true)) {
      throw new Error(
        `Invalid Fields were found in update data for ${this.constructor.name}`
      );
    }
    await updateDoc(this._doc, data);
    return await this._refreshData();
  }
  async delete(): Promise<void> {
    await deleteDoc(this._doc);
  }
  async updateAtomic(updateFunc: (data: {}) => Promise<{}>): Promise<this> {
    await runTransaction(getFirestore(), async (transaction) => {
      const docSnap = await transaction.get(this._doc);
      if (!docSnap.exists()) {
        throw new Error(`Document ${this._doc.path} does not exist!`);
      }
      const updateData = await updateFunc(docSnap.data());
      if (this.constructor.validate(updateData, true)) {
        transaction.update(this._doc, updateData);
      } else {
        throw new Error(
          `Invalid Fields were found in update data for ${this.constructor.name}`
        );
      }
    });
    return await this._refreshData();
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
  FirebaseSchema,
  FirebaseModel,
};
