import baseGate from "./baseGate";

export default class extends baseGate {

  async handle() {
    if (
      !("mediaDevices" in navigator) ||
      !("getUserMedia" in navigator.mediaDevices)
    ) {
      alert("Your browser does not support using a camera.");
      return this.fail();
    }

    return await navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => { })
      .catch(() => {
        alert("You must give us camera permissions to continue.");
        return this.fail();
      });
  }
}