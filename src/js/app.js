/* global atob, Buffer, TextDecoder, BUILD_VERSION, Blob, TextEncoder, copyToClipboard */

import "bootstrap";
import $ from "jquery";

import "./copy-to-clipboard.js";

function reformIndents(s) {
  const s2 = s
    .split(new RegExp("\n", "g"))
    .map((s) => s.trim())
    .join("\n");
  return s2.trim();
}

function handlePaste(e) {
  let elt = this;
  setTimeout(function () {
    var text = reformIndents($(elt).val());
    $(elt).val(text);
  }, 100);
}

// function copyToClipboard(event) {
//   event.preventDefault();
//   const source = event.target || event.srcElement,
//     id = source.getAttribute("id"),
//     value = $sel(`#${id}`).value;
//
//   let $elt = $(this),
//     sourceElement = $elt.data("target"),
//     // grab the element to copy
//     $source = $("#" + sourceElement),
//     // Create a temporary hidden textarea.
//     $temp = $("<textarea>");
//
//   //let textToCopy = $source.val();
//   // in which case do I need text() ?
//   let textToCopy =
//     $source[0].tagName == "TEXTAREA" || $source[0].tagName == "INPUT"
//       ? $source.val()
//       : $source.text();
//
//   $("body").append($temp);
//   $temp.val(textToCopy).select();
//   let success;
//   try {
//     success = document.execCommand("copy");
//     if (success) {
//       // Animation to indicate copy.
//       // CodeMirror obscures the original textarea, and appends a div as the next sibling.
//       // We want to flash THAT.
//       let $cmdiv = $source.next();
//       if (
//         $cmdiv.length > 0 &&
//         $cmdiv.prop("tagName").toLowerCase() == "div" &&
//         $cmdiv.hasClass("CodeMirror")
//       ) {
//         $cmdiv
//           .addClass("copy-to-clipboard-flash-bg")
//           .delay("1000")
//           .queue((_) =>
//             $cmdiv.removeClass("copy-to-clipboard-flash-bg").dequeue()
//           );
//       } else {
//         // no codemirror (probably the secretkey field, which is just an input)
//         $source
//           .addClass("copy-to-clipboard-flash-bg")
//           .delay("1000")
//           .queue((_) =>
//             $source.removeClass("copy-to-clipboard-flash-bg").dequeue()
//           );
//       }
//     }
//   } catch (e) {
//     success = false;
//   }
//   $temp.remove();
//   return success;
// }

function setAlert(html, alertClass) {
  let buttonHtml =
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">\n' +
      ' <span aria-hidden="true">&times;</span>\n' +
      "</button>",
    $mainalert = $("#mainalert");
  $mainalert.html(html + buttonHtml);
  if (alertClass) {
    $mainalert.removeClass("alert-warning"); // this is the default
    $mainalert.addClass("alert-" + alertClass); // success, primary, warning, etc
  } else {
    $mainalert.addClass("alert-warning");
  }
  // show()
  $mainalert.removeClass("fade").addClass("show");
  setTimeout(() => $("#mainalert").addClass("fade").removeClass("show"), 5650);
}

function closeAlert(event) {
  //$("#mainalert").toggle();
  $("#mainalert").removeClass("show").addClass("fade");
  return false; // Keep close.bs.alert event from removing from DOM
}

function getKeyValue(flavor /* public || private */) {
  return $("#ta_" + flavor + "key").val();
}

function key2pem(flavor, keydata) {
  let body = window.btoa(String.fromCharCode(...new Uint8Array(keydata)));
  body = body.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${flavor} KEY-----\n${body}\n-----END ${flavor} KEY-----`;
}

function getGenKeyParamsForRSA(hash) {
  return {
    name: "RSASSA-PKCS1-v1_5", // this name also works for RSA-PSS !
    modulusLength: 2048, //can be 1024, 2048, or 4096
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: hash } // eg "SHA-256", or "SHA-512"
  };
}

function userDownload(blob, fileName) {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  var url = window.URL.createObjectURL(blob);
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

function newKeyPair(event) {
  let keyUse = ["sign", "verify"], // irrelevant for our purposes (PEM Export)
    isExtractable = true,
    genKeyParams = getGenKeyParamsForRSA("SHA-256");
  return window.crypto.subtle
    .generateKey(genKeyParams, isExtractable, keyUse)
    .then((key) =>
      Promise.all([exportPublicToPem(key), exportPrivateToPkcs8(key)])
    )
    .then(([publickey, privatekey]) => {
      $("#ta_publickey").val(publickey + "\n");
      $("#ta_privatekey").val(privatekey + "\n");
      $("#ta_privatekey").data("key-id", generateKeyId());
    })
    .then(() => {
      $("#mainalert").removeClass("show").addClass("fade");
    });
}

function generateKeyId() {
  let LENGTH = 28,
    s = "";
  do {
    s += Math.random().toString(36).substring(2, 15);
  } while (s.length < LENGTH);
  return s.substring(0, LENGTH);
}

function getKeyId() {
  return $("#ta_privatekey").data("key-id");
}

function downloadPem() {
  let flavor = this.dataset.flavor;
  let privatekey = getKeyValue(flavor);
  let blob = new Blob([privatekey], { type: "text/plain; encoding=utf8" });
  let keyId = getKeyId();
  userDownload(blob, `rsa-${flavor}key-${keyId}.pem`);
}

function downloadJson() {
  let key_id = getKeyId(),
    json = {
      type: `RSA key pair`,
      generated: new Date().toISOString(),
      key_id,
      public_key: getKeyValue("public"),
      private_key: getKeyValue("private")
    };

  let blob = new Blob([JSON.stringify(json, null, 2)], {
    type: "text/plain; encoding=utf8"
  });
  userDownload(blob, `rsa-keypair-${key_id}.json`);
}

// $(document).ready(function () {
//   $("#version_id").text(BUILD_VERSION);
//   $(".btn-copy").on("click", copyToClipboard);
//   $(".btn-newkeypair").on("click", newKeyPair);
//   $(".btn-download-pem").on("click", downloadPem);
//   $(".btn-download-json").on("click", downloadJson);
//
//   $("#ta_privatekey").on("paste", handlePaste);
//   $("#ta_publickey").on("paste", handlePaste);
//
//   $("#mainalert").addClass("fade");
//   $("#mainalert").on("close.bs.alert", closeAlert);
//
//   newKeyPair();
// });

const $sel = (query) => document.querySelector(query),
  $all = (query) => document.querySelectorAll(query);

document.addEventListener("DOMContentLoaded", (_event) => {
  $sel("#version_id").innerHTML(BUILD_VERSION);
  //$(".btn-copy").on("click", copyToClipboard);
  $sel(".btn-copy").addEventListener("click", copyToClipboard);

  $(".btn-newkeypair").on("click", newKeyPair);
  $(".btn-download-pem").on("click", downloadPem);
  $(".btn-download-json").on("click", downloadJson);

  $("#ta_privatekey").on("paste", handlePaste);
  $("#ta_publickey").on("paste", handlePaste);

  $("#mainalert").addClass("fade");
  $("#mainalert").on("close.bs.alert", closeAlert);

  newKeyPair();
});
