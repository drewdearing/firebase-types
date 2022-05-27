//@flow
import FirebaseType from "./firebase-type";
import FirebaseModel from "../firebase-model";

import { DocumentReference } from "firebase/firestore";

export default class FirebaseReference extends FirebaseType {
  _isType(value: any): boolean {
    return value
      ? this._validateModel(value) &&
          (value instanceof FirebaseModel || value instanceof DocumentReference)
      : false;
  }
  _validateModel(value: any): boolean {
    return this._options.model && value instanceof FirebaseModel
      ? value instanceof this._options.model
      : true;
  }
  static getFirestoreSafeData(value: any): any {
    return value
      ? value instanceof FirebaseModel
        ? value._doc
        : value
      : undefined;
  }
}
