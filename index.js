const license = require("./license");

async function start() {
  // Halts program is halted till a valid user is retrieved.
  await license.validate();

  // This is only accessible after verification
  // console.log("Confidential! Sussh ...");

  // Access the user
  // console.log("User:", license["activation"]["user"]);

  // Access the entire activation object
  // console.log("Activation", license["activation"]);

  // To delete your application simply call this anywhere.
  // await license.delete();
}

start();
