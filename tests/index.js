"use strict";

const index = require("../build/index.js");

const firebaseApp = require("@firebase/app");

const _ = require("lodash");

const env = require("dotenv");

env.config();

const FirebaseMap = index.FirebaseMap;
const FirebaseArray = index.FirebaseArray;
const FirebaseString = index.FirebaseString;
const FirebaseNumber = index.FirebaseNumber;
const FirebaseBool = index.FirebaseBool;
const FirebaseNull = index.FirebaseNull;
const FirebaseModel = index.FirebaseModel;
const FirebaseSchema = index.FirebaseSchema;

const initializeApp = firebaseApp.initializeApp;
const deleteApp = firebaseApp.deleteApp;

function expectEqual(actual, expected, test) {
  if (!_.isEqual(actual, expected)) {
    throw new Error(
      `Test ${test}: ${actual} not equal to expected ${expected}`
    );
  } else {
    console.log(`Passed Test: ${test}`);
  }
}

function expectNotEqual(first, second, test) {
  try {
    expectEqual(first, second, test);
    throw new Error(`Test ${test}: ${first} is equal to ${second}`);
  } catch (e) {
    console.log(`Passed Test: ${test}`);
  }
}

function expectError(callback, expected, test) {
  let error = false;
  try {
    callback();
  } catch (e) {
    error = true;
  }
  expectEqual(error, expected, test);
}

async function expectErrorAsync(promise, expected, test) {
  let error = false;
  try {
    await promise;
  } catch (e) {
    error = true;
  }
  expectEqual(error, expected, test);
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

const map = new FirebaseMap({
  hello: new FirebaseString({ updatable: false }),
});

expectEqual(map.validate({ hello: "hi" }), true, "map validate string");
expectEqual(
  map.validate({ hello: "hi" }, true),
  false,
  "map update non-updatable string"
);

const map2 = new FirebaseMap({
  hello: new FirebaseString(),
});

expectError(
  () => {
    map2.override({ hello: new FirebaseNumber() });
  },
  true,
  "map override with wrong type"
);

expectError(
  () => {
    map2.override({ hello: new FirebaseString({ updatable: true }) });
  },
  false,
  "map override with correct type"
);

const map3 = new FirebaseMap({
  hello: new FirebaseString(),
  other: new FirebaseNumber(),
});

expectEqual(
  map3.validate({ hello: "hi" }, true),
  true,
  "validate update single field"
);

const app = initializeApp(JSON.parse(process.env.TEST_CONFIG));

const testSchema = new FirebaseSchema({
  hello: new FirebaseString(),
  number: new FirebaseNumber(),
});

class TestModel extends FirebaseModel {
  static collectionPath(data) {
    return "test";
  }
  static modelSchema() {
    return testSchema;
  }
}

const testFirestore = async () => {
  let test_data = { hello: "what up", number: 0 };
  let model = await TestModel.create(test_data);
  expectEqual(model._data, test_data, "create model data on firestore");
  test_data.hello = "yo";
  let model2 = await model.set(test_data);
  expectEqual(model.id, model2.id, "model set ids match");
  expectNotEqual(
    model.data.hello,
    model2.data.hello,
    "model data different after setting new data"
  );
  let model3 = await model2.update({ hello: "meow" });
  expectNotEqual(model3.data.hello, model2.data.hello, "update model data");
  await Promise.all(
    _.range(10).map((i) =>
      model2.updateAtomic(async (data) => {
        return { number: data.number + 1 };
      })
    )
  );
  let model4 = await TestModel.getByID(model3.id);
  expectEqual(model4.data.number, 10, "concurrent atomic update");
  await expectErrorAsync(
    TestModel.create(test_data, model4.id),
    true,
    "error on create: existing id"
  );
  model4.data.number = 0;
  expectNotEqual(model4.data.number, 0, "prevent updates to model data");
  model4._data.number = "jello";
  await expectErrorAsync(
    model4.set(),
    true,
    "stop updating _data with invalid type"
  );
  await model4.delete();
  await expectErrorAsync(
    TestModel.getByID(model4.id),
    true,
    "deleted model doesn't exist"
  );
  let model5 = await model3.set();
  expectEqual(model5.data, model3.data, "save after deletion");
  let listenerWasCalled = false;
  let listener = model5.listen((model) => {
    listenerWasCalled = true;
  });
  await model5.update({ hello: "listener test" });
  expectEqual(listenerWasCalled, true, "listener was called after update");
  listenerWasCalled = false;
  listener.stop();
  await model5.update({ hello: "listener test 2" });
  expectEqual(listenerWasCalled, false, "listener was not called after stop");
  model5.delete();
};

testFirestore()
  .then(() => {
    deleteApp(app);
  })
  .catch((e) => {
    console.log(e);
    deleteApp(app);
  });
