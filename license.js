const inquirer = require("inquirer");
const fetch = require("node-fetch");
const { machineIdSync } = require("node-machine-id");
const os = require("os");
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const { red, green, blue } = require("colorette");

class License {
  ENDPOINT = "https://www.edgesnkrs.com/api/v1";
  BEARER_TOKEN = "ak_7soZNKKTiCsXDBvZMW_y";
  HWID = machineIdSync(true);
  DEVICE_NAME = os.hostname();
  TOKEN_LOC = path.join(__dirname, "token.txt");

  token = null;
  activation = null;

  // Activation variable.
  get activation() {
    return this.activation;
  }

  // Welcome message.
  welcomeMessage = (user, renewal) => {
    const timeLeft = dayjs.unix(renewal).diff(dayjs(), "day");
    console.log(
      `Welcome ${green(
        user.discord_username
      )}! You subscription valid for: ${timeLeft} days.`
    );
  };

  // POST API Activation.
  getToken = async (key) =>
    fetch(`${this.ENDPOINT}/activations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        activation: {
          hwid: this.HWID,
          device_name: this.DEVICE_NAME,
        },
      }),
    });

  // GET API Activation.
  getActivation = async (token) =>
    fetch(`${this.ENDPOINT}/activations/${token}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.BEARER_TOKEN}`,
      },
    });

  // DELETE API Activation.
  deleteActivation = async (token) =>
    fetch(`${this.ENDPOINT}/activations/${token}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.BEARER_TOKEN}`,
      },
    });

  // Delete User.
  async delete() {
    // Load token
    try {
      this.token = fs.readFileSync(this.TOKEN_LOC, "utf8");
    } catch (err) {}

    // Check empty token.
    if (!this.token) {
      console.log(red(">>"), `Token not found at: ${this.TOKEN_LOC}`);
      process.exit();
    }

    // Delete request
    try {
      const deleteResponse = await this.deleteActivation(this.token);

      // Check HTTP response
      switch (deleteResponse["status"]) {
        case 200:
          break;
        case 404:
          throw new Error("Token is invalid.");
        default:
          throw new Error(
            "Failed to connected to server. Please try again ..."
          );
      }

      const json = await deleteResponse.json();

      // Check if valid JSON
      if (!json["success"]) {
        return "Received JSON is invalid!";
      }
    } catch (err) {
      console.log(red(">>"), err.message);
      process.exit();
    }

    // Delete file
    try {
      fs.unlinkSync(this.TOKEN_LOC);
    } catch (err) {
      console.log(red(">>"), `Token file delete: ${this.TOKEN_LOC} failed!`);
      process.exit();
    }

    // Success
    console.log(green(">>"), `Key deleted!`);

    // Exit program
    process.exit();
  }

  // Validate User.
  async validate() {
    // Load token
    try {
      this.token = fs.readFileSync(this.TOKEN_LOC, "utf8");
    } catch (err) {}

    // Ask Product key
    if (!this.token) {
      await inquirer.prompt([
        {
          name: "key",
          message: "Please enter product key:",
          validate: async (input) => {
            // Validate key
            try {
              const keyResponse = await this.getToken(input.trim());

              // Check HTTP response
              switch (keyResponse["status"]) {
                case 200:
                  break;
                case 404:
                  return "Key is invalid!";
                case 409:
                  return `Key is already in use on another device! Did you delete the file: ${this.TOKEN_LOC}}?`;
                default:
                  return "Failed to connected to server. Please try again ...";
              }

              const json = await keyResponse.json();

              // Check if valid JSON
              if (!json["activation_token"]) {
                return "Received JSON is invalid!";
              }

              this.token = json["activation_token"];
            } catch (err) {
              return `Activation failed!: ${err.message}`;
            }

            return true;
          },
        },
      ]);

      // Save token to file
      fs.writeFileSync(this.TOKEN_LOC, this.token);
    }

    // Validate token
    try {
      const activationResponse = await this.getActivation(this.token);

      // Check if valid HTTP response
      switch (activationResponse["status"]) {
        case 200:
          break;
        case 404:
          throw new Error("Token is invalid!");
        default:
          throw new Error(
            "Failed to connected to server. Please try again ..."
          );
      }

      const json = await activationResponse.json();

      // Check if valid JSON
      if (
        !json["success"] ||
        !json["renewal"] ||
        Object.keys(json["user"]).length === 0
      ) {
        throw new Error("Received JSON is invalid!");
      }

      // Save activation
      this.activation = json;
    } catch (err) {
      console.log(red(">>"), err.message);
    }

    if (!this.activation) {
      process.exit();
    }

    // Welcome user
    this.welcomeMessage(this.activation.user, this.activation.renewal);
  }
}

module.exports = new License();
