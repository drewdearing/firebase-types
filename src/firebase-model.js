//@flow
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
} from "firebase/firestore";

import FirebaseSchema from "./firebase-schema";

const _ = require("lodash");

export default class FirebaseModel {
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
      docRef = await addDoc(colRef, this.getFirestoreSafeData(data));
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
      await setDoc(docRef, this.getFirestoreSafeData(data));
    }
    let docSnap = await getDoc(docRef);
    return new this(docSnap);
  }
  static async getByID(id: string, data: ?{} = null): Promise<this> {
    let colRef = collection(getFirestore(), this.collectionPath(data));
    let docSnap = await getDoc(doc(colRef, id));
    return new this(docSnap);
  }
  static async getByReference(ref: any): Promise<this> {
    let docRef = doc(getFirestore(), ref.path);
    let docSnap = await getDoc(docRef);
    return new this(docSnap);
  }
  static getFirestoreSafeData(data: {}): {} {
    return Object.fromEntries(
      Object.entries(data)
        .filter((entry) => entry[1] !== undefined)
        .map((entry) => {
          entry[1] = this.modelSchema().getFirestoreSafeData(
            entry[0],
            entry[1]
          );
          return entry;
        })
    );
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
    await setDoc(this._doc, this.constructor.getFirestoreSafeData(data));
    return await this._refreshData();
  }
  async update(data: {}): Promise<this> {
    if (!this.constructor.validate(data, true)) {
      throw new Error(
        `Invalid Fields were found in update data for ${this.constructor.name}`
      );
    }
    await updateDoc(this._doc, this.constructor.getFirestoreSafeData(data));
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
        transaction.update(
          this._doc,
          this.constructor.getFirestoreSafeData(updateData)
        );
      } else {
        throw new Error(
          `Invalid Fields were found in update data for ${this.constructor.name}`
        );
      }
    });
    return await this._refreshData();
  }
}
