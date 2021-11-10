import {
  FirebaseMap,
  FirebaseArray,
  FirebaseString,
  FirebaseNumber,
  FirebaseBool,
  FirebaseNull,
} from "../index.js";

const _ = require("lodash");

function expectEqual(actual, expected, test) {
  if (!_.isEqual(actual, expected)) {
    throw new Error(
      `Test ${test}: ${actual} not equal to expected ${expected}`
    );
  } else {
    console.log(`Passed Test: ${test}`);
  }
}

const string = new FirebaseString();
expectEqual(string.validate("hello"), true, "string validates string");
expectEqual(string.validate(2), false, "string validates number");
expectEqual(
  string.validate(new String()),
  false,
  "string validates new String()"
);
expectEqual(
  string.validate(new String().toString()),
  true,
  "string validates new String().toString()"
);
expectEqual(string.validate(undefined), false, "string validates undefined");
expectEqual(string.validate({}), false, "string validates object");
expectEqual(
  string.validate(["hello"]),
  false,
  "string validates array<string>"
);
expectEqual(string.validate(null), false, "string validates null");

const string2 = string.clone();
expectEqual(string2 === string, false, "string clone compare FirebaseType");
expectEqual(
  string2._options === string._options,
  false,
  "string clone compare options"
);

const string3 = new FirebaseString({ required: false });
expectEqual(
  string3.validate(undefined),
  true,
  "string not required validates undefined"
);
