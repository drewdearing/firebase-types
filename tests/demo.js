"use strict";

const index = require("../build/index.js");

const firebaseApp = require("firebase/app");

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

const app = initializeApp(JSON.parse(process.env.TEST_CONFIG));

const Countries = Object.freeze({
  MEXICO: "Mexico",
  USA: "USA",
  CANADA: "Canada",
  JAPAN: "Japan",
});

const northAmericanSchema = new FirebaseSchema({
  name: new FirebaseString(), //name is required
  age: new FirebaseNumber({ required: false, nullable: true }), //age is not required and nullable
  uid: new FirebaseString({ updatable: false }), //prevent updates
  country: new FirebaseString({
    enum: Countries,
    enum_values: [Countries.MEXICO, Countries.USA, Countries.CANADA], //restrict enum values
  }),
});

class NorthAmerican extends FirebaseModel {
  static collectionPath(data) {
    return "NorthAmerican";
  }
  static modelSchema() {
    return northAmericanSchema;
  }
}

const demo = async () => {
  const nAmerican = await NorthAmerican.create(
    {
      name: "John Smith",
      age: null,
      uid: "123",
      country: Countries.USA,
    },
    "123" //optionally assign doc id
  );

  console.log(nAmerican.data.name); //John Smith

  console.log(nAmerican.data.age); //null

  let nAmerican2 = await nAmerican.update({ age: 24 });

  console.log(nAmerican2.id === nAmerican.id); //true

  console.log(nAmerican2.data.age); //24

  nAmerican2 = await nAmerican2.update({ country: Countries.CANADA });

  console.log(nAmerican2.data.country); //Canada

  //nAmerican2 = await nAmerican2.update({ country: Countries.JAPAN }); //error

  //nAmerican2 = await nAmerican2.update({ uid: "124" }); //error

  await nAmerican2.delete();
};

demo()
  .then(() => {
    deleteApp(app);
  })
  .catch((e) => {
    console.log(e);
    deleteApp(app);
  });
