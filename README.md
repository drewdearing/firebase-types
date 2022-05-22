# firestore-type-validator
Document Schema Validator for Firestore

## Defining a Firebase Schema

```
const Countries = Object.freeze({
  MEXICO: "Mexico",
  USA: "USA",
  CANADA: "Canada",
  JAPAN: "Japan",
});

const northAmericanSchema = new FirebaseSchema({
  name: new FirebaseString({ required: true }), //name is required
  age: new FirebaseNumber(),
  uid: new FirebaseString({ updatable: false }), //prevent updates
  country: new FirebaseString({
    enum: Countries,
    enum_values: [Countries.MEXICO, Countries.USA, Countries.CANADA], //restrict enum values
  }),
});
```

## Defining a Firebase Model

```
class NorthAmerican extends FirebaseModel {
  static collectionPath(data) {
    return "NorthAmerican";
  }
  static modelSchema() {
    return northAmericanSchema;
  }
}
```

## Using a Firebase Model
```
const nAmerican = await NorthAmerican.create(
    {
      name: "John Smith",
      age: 23,
      uid: "123",
      country: Countries.USA,
    },
    "123" //optionally create firestore doc with id
  );

  console.log(nAmerican.data.name); //John Smith

  let nAmerican2 = await nAmerican.update({ age: 24 });

  console.log(nAmerican2.id === nAmerican.id); //true

  console.log(nAmerican2.data.age); //24

  nAmerican2 = await nAmerican2.update({ country: Countries.CANADA });

  console.log(nAmerican2.data.country); //Canada

  nAmerican2 = await nAmerican2.update({ country: Countries.JAPAN }); //error

  nAmerican2 = await nAmerican2.update({ uid: "124" }); //error
```
