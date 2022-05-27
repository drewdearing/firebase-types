//@flow
import FirebaseType from "./firebase-type";

export default class FirebaseNumber extends FirebaseType {
  _isType(value: any): boolean {
    return typeof value === "number";
  }
}
