// Copyright © 2020-2024 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/* global atob, Buffer, BUILD_VERSION, Blob  */

/* import { _Tooltip, Popover } from "bootstrap"; */

import LocalStorage from "./LocalStorage.js";
import Clipboard from "./copy-to-clipboard.js";

const RSA_KEYTYPE = "RSASSA-PKCS1-v1_5", // "RSA-PSS"
  RSA_HASH = "SHA-256";
const html5AppId = "40F735E1-7977-4997-A7EE-FD1CFD84D470";
const storage = LocalStorage.init(html5AppId);
const $sel = (query) => document.querySelector(query),
  $all = (query) => document.querySelectorAll(query);

const datamodel = {
  "sel-variant": "",
  "sel-curve": "",
  "ta-publickey-RSA": "",
  "ta-privatekey-RSA": "",
  "ta-keyid-RSA": "",
  "ta-publickey-EC": "",
  "ta-privatekey-EC": "",
  "ta-keyid-EC": ""
};

function retrieveLocalState() {
  Object.keys(datamodel).forEach((key) => {
    const value = storage.get(key);
    if (key.startsWith("chk-")) {
      datamodel[key] = String(value) == "true";
    } else {
      datamodel[key] = value;
    }
  });
}

function saveSetting(key, value) {
  datamodel[key] = value;
  storage.store(key, value);
}

function setSelectOptionByValue(el, etxt) {
  for (let i = 0; i < el.options.length; ++i) {
    if (el.options[i].value === etxt) {
      el.options[i].selected = true;
    }
  }
}

function applyState() {
  // ordering is important. We must apply variant before curve.
  const keys = Object.keys(datamodel);
  keys.sort((a, b) =>
    a == "sel-variant" ? -1 : b == "sel-variant" ? 1 : a.localeCompare(b)
  );
  keys.forEach((key) => {
    const value = datamodel[key];
    if (value) {
      let el = $sel("#" + key);
      if (key.startsWith("sel-")) {
        setSelectOptionByValue(el, value);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (key.startsWith("chk-")) {
        el.checked = String(value) == "true";
      } else if (
        key.startsWith("ta-publickey-") ||
        key.startsWith("ta-privatekey-") ||
        key.startsWith("ta-keyid-")
      ) {
        //const keytype = key.substr(3);
        const parts = key.split("-");
        if (parts[2] == datamodel["sel-variant"]) {
          const id = parts.slice(0, -1).join("-");
          el = $sel(`#${id}`);
          el.value = value;
        }
      } else {
        el.value = value;
      }
    }
  });

  const currentlySelectedVariant = getSelectedVariant();
  if (currentlySelectedVariant == "RSA") {
    const elCurve = $sel("#sel-curve");
    elCurve.classList.add("hide");
    elCurve.classList.remove("show");
  }
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function reformIndents(s) {
  const s2 = s
    .split(new RegExp("\n", "g"))
    .map((s) => s.trim())
    .join("\n");
  return s2.trim();
}

function handlePaste(event) {
  const elem = event.currentTarget;
  setTimeout(function () {
    const text = reformIndents(elem.value);
    elem.value = text;
  }, 100);
}

// function setAlert(html, alertClass) {
//   const buttonHtml =
//       '<button type="button" class="close" data-dismiss="alert" aria-label="Close">\n' +
//       ' <span aria-hidden="true">&times;</span>\n' +
//       "</button>",
//     mainalert = $sel("#mainalert");
//   mainalert.innerHTML = html + buttonHtml;
//   if (alertClass) {
//     mainalert.classList.remove("alert-warning"); // this is the default
//     mainalert.classList.add("alert-" + alertClass); // success, primary, warning, etc
//   } else {
//     mainalert.classList.add("alert-warning");
//   }
//   // show()
//   mainalert.classList.remove("fade");
//   mainalert.classList.add("show");
//   setTimeout(() => {
//     const mainalert = $sel("#mainalert");
//     mainalert.classList.add("fade");
//     mainalert.classList.remove("show");
//   }, 5650);
// }

function closeAlert(_event) {
  const mainalert = $sel("#mainalert");
  mainalert.classList.remove("show");
  mainalert.classList.add("fade");
  return false; // Keep close.bs.alert event from removing from DOM
}

function getKeyValue(flavor /* public || private */) {
  return $sel("#ta-" + flavor + "key").value;
}

function key2pem(flavor, keydata) {
  let body = window.btoa(String.fromCharCode(...new Uint8Array(keydata)));
  body = body.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${flavor} KEY-----\n${body}\n-----END ${flavor} KEY-----`;
}

function userDownload(blob, fileName) {
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

// function getTimestampString() {
//   let s = (new Date()).toISOString(); // ex: 2019-09-04T21:29:23.428Z
//   let re = new RegExp('[-:TZ\\.]', 'g');
//   return s.replace(re, '');
// }

function displayKeyValues(publickey, privatekey, keyid) {
  $sel("#ta-publickey").value = publickey + "\n";
  $sel("#ta-privatekey").value = privatekey + "\n";
  $sel("#ta-keyid").value = keyid;
}

function displayAndStoreKeyValues(publickey, privatekey, keyid) {
  const variant = getSelectedVariant();
  displayKeyValues(publickey, privatekey, keyid);
  saveSetting(`ta-privatekey-${variant}`, privatekey);
  saveSetting(`ta-publickey-${variant}`, publickey);
  saveSetting(`ta-keyid-${variant}`, keyid);
}

function exportPublicToPem(key) {
  return window.crypto.subtle
    .exportKey("spki", key.publicKey)
    .then((r) => key2pem("PUBLIC", r));
}

function exportPrivateToPkcs8(key) {
  return window.crypto.subtle
    .exportKey("pkcs8", key.privateKey)
    .then((r) => key2pem("PRIVATE", r));
}

function reconstitutePrivateKeyFromPem(variant, namedCurve) {
  const pem = getKeyValue("private");
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length - 1
  );
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);
  const params =
    variant == "EC"
      ? { name: "ECDSA", namedCurve }
      : {
          name: RSA_KEYTYPE,
          hash: RSA_HASH
        };

  return window.crypto.subtle.importKey("pkcs8", binaryDer, params, true, [
    "sign"
  ]);
}

function getGenKeyParamsForECDSA() {
  const el = $sel("#sel-curve");
  const namedCurve = el.options[el.selectedIndex].value;
  return {
    name: "ECDSA",
    namedCurve
  };
}

function getGenKeyParamsForRSA(hash) {
  return {
    name: RSA_KEYTYPE,
    modulusLength: 2048, //can be 1024, 2048, or 4096
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: hash } // eg "SHA-256", or "SHA-512"
  };
}

function newKeyPair(_event) {
  const variant = getSelectedVariant(),
    genKeyParams =
      variant == "RSA"
        ? getGenKeyParamsForRSA(RSA_HASH)
        : getGenKeyParamsForECDSA(),
    isExtractable = true,
    keyUse = ["sign", "verify"]; // relevant only for JWK export

  return window.crypto.subtle
    .generateKey(genKeyParams, isExtractable, keyUse)
    .then((key) =>
      Promise.all([exportPublicToPem(key), exportPrivateToPkcs8(key)])
    )
    .then(([publickey, privatekey]) => {
      const keyid = generateKeyId();
      displayAndStoreKeyValues(publickey, privatekey, keyid);
    })
    .then(() => {
      const mainalert = $sel("#mainalert");
      mainalert.classList.remove("show");
      mainalert.classList.add("fade");
    });
}

function generateKeyId() {
  const LENGTH = 28;
  let s = "";
  do {
    s += Math.random().toString(36).substring(2, 15);
  } while (s.length < LENGTH);
  return s.substring(0, LENGTH);
}

function getKeyId() {
  return $sel("#ta-keyid").value;
}

function getSelectedCurve() {
  const elCurve = $sel("#sel-curve");
  return elCurve.options[elCurve.selectedIndex].value;
}

function getSelectedVariant() {
  const elVariant = $sel("#sel-variant");
  return elVariant.options[elVariant.selectedIndex].value;
}

function downloadPem(event) {
  const elem = event.currentTarget, // or this?
    keyFlavor = elem.getAttribute("data-flavor"),
    privatekey = getKeyValue(keyFlavor),
    blob = new Blob([privatekey], { type: "text/plain; encoding=utf8" }),
    keyId = getKeyId(),
    variant = getSelectedVariant(),
    filename =
      variant == "RSA"
        ? `${variant}-${keyFlavor}key-${keyId}.pem`
        : `${variant}-${getSelectedCurve()}-${keyFlavor}key-${keyId}.pem`;
  userDownload(blob, filename);
}

function downloadJsonKeypair() {
  const variant = getSelectedVariant(),
    key_id = getKeyId(),
    json = {
      type: `${variant} key pair`,
      generated: new Date().toISOString(),
      generator: "dinochiesa.github.io/download-keypair",
      key_id,
      public_key: getKeyValue("public"),
      private_key: getKeyValue("private")
    };

  if (variant == "EC") {
    json.namedCurve = getSelectedCurve();
  }
  const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "text/plain; encoding=utf8"
    }),
    filename =
      variant == "RSA"
        ? `${variant}-keypair-${key_id}.json`
        : `${variant}-${getSelectedCurve()}-keypair-${key_id}.json`;

  userDownload(blob, filename);
}

async function exportPrivateToJwk(cryptoKey) {
  const jwk = await window.crypto.subtle.exportKey("jwk", cryptoKey);
  return [jwk, "private"];
  //    .then((r) => JSON.stringify(r, null, "  "));
}

async function exportPublicToJwk(cryptoKey) {
  // bunch of pushups to convert private key to public key JWK
  const [jwkPrivate] = await exportPrivateToJwk(cryptoKey);
  const alg = cryptoKey.algorithm;
  delete jwkPrivate.d;
  if (jwkPrivate.dp) {
    delete jwkPrivate.dp;
    delete jwkPrivate.dq;
    //delete jwkPrivate.p;
    delete jwkPrivate.q;
    delete jwkPrivate.qi;
  }
  jwkPrivate.key_ops = ["verify"];
  const jwk = await window.crypto.subtle
    .importKey(
      "jwk",
      jwkPrivate,
      {
        name: alg.name,
        namedCurve: alg.namedCurve,
        hash: alg.hash && alg.hash.name
      },
      true,
      ["verify"]
    )
    .then((key) => window.crypto.subtle.exportKey("jwk", key));
  return [jwk, "public"];
}

function downloadJwk(exportFn) {
  return async function () {
    const variant = getSelectedVariant(),
      key_id = getKeyId(),
      key = await reconstitutePrivateKeyFromPem(
        variant,
        variant == "EC" ? getSelectedCurve() : false
      ),
      [json, pubpriv] = await exportFn(key);

    json.kid = key_id;

    const blob = new Blob([JSON.stringify({ keys: [json] }, null, 2)], {
        type: "text/plain; encoding=utf8"
      }),
      filename =
        variant == "RSA"
          ? `${variant}-jwk-${pubpriv}-${key_id}.json`
          : `${variant}-${json.crv}-jwk-${pubpriv}-${key_id}.json`;

    userDownload(blob, filename);
  };
}

function conditionallyShowCurve(variantSelection) {
  const elCurve = $sel("#sel-curve");
  if (variantSelection == "RSA") {
    // not used for RSA
    elCurve.classList.add("hide");
    elCurve.classList.remove("show");
  } else {
    elCurve.classList.add("show");
    elCurve.classList.remove("hide");
  }
}

function resetKeyValues(variant) {
  const ids = ["publickey", "privatekey", "keyid"].map(
    (w) => `ta-${w}-${variant}`
  );
  const values = ids.map((id) => datamodel[id] || "");

  displayKeyValues(values[0], values[1], values[2]);
}

function onChangeVariant(_event) {
  const newSelection = getSelectedVariant();
  conditionallyShowCurve(newSelection);
  saveSetting("sel-variant", newSelection);
  resetKeyValues(newSelection);
}

function onChangeCurve(_event) {
  const elCurve = $sel("#sel-curve");
  const newSelection = elCurve.options[elCurve.selectedIndex].value;
  resetKeyValues();
  saveSetting("sel-curve", newSelection);
}

document.addEventListener("DOMContentLoaded", (_event) => {
  retrieveLocalState();
  applyState();

  $sel("#version_id").innerHTML = BUILD_VERSION;
  $sel(".btn-newkeypair").addEventListener("click", newKeyPair);
  $sel(".btn-download-json").addEventListener("click", downloadJsonKeypair);
  $sel(".btn-download-jwk-private").addEventListener(
    "click",
    downloadJwk(exportPrivateToJwk)
  );
  $sel(".btn-download-jwk-public").addEventListener(
    "click",
    downloadJwk(exportPublicToJwk)
  );

  $all(".btn-copy").forEach((btn) =>
    btn.addEventListener("click", Clipboard.copy)
  );
  $all(".btn-download-pem").forEach((btn) =>
    btn.addEventListener("click", downloadPem)
  );
  $all(".reform-indent-on-paste").forEach((ta) =>
    ta.addEventListener("paste", handlePaste)
  );

  $sel("#sel-variant").addEventListener("change", onChangeVariant);
  $sel("#sel-curve").addEventListener("change", onChangeCurve);

  const mainalert = $sel("#mainalert");
  mainalert.classList.add("fade");
  // not sure if the following is used
  mainalert.addEventListener("close.bs.alert", closeAlert);

  const variant = getSelectedVariant();
  conditionallyShowCurve(variant);
  if (
    !datamodel[`ta-privatekey-${variant}`] ||
    !datamodel[`ta-publickey-${variant}`]
  ) {
    newKeyPair();
  }
});
