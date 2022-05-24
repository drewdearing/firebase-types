//@flow
import FirebaseType from "./firebase-type";

export default class FirebaseBool extends FirebaseType {
  static _isType(value: any): boolean {
    return typeof value === "boolean";
  }
}