//@flow
import FirebaseType from "./firebase-type";

export default class FirebaseNull extends FirebaseType {
  _isType(value: any): boolean {
    return value === null;
  }
}
