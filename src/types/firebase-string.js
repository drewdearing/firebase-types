//@flow
import FirebaseType from "./firebase-type";

export default class FirebaseString extends FirebaseType {
  static _isType(value: any): boolean {
    return typeof value === "string";
  }
}