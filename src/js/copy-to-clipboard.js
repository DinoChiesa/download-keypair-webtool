// Copyright © 2019-2024 Google LLC.
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
// created: Tue Oct  1 16:53:51 2019
// last saved: <2024-February-12 17:53:52>

/* jshint esversion:9, node:false, strict:implied */
/* global window, document, setTimeout */

const copyReceiverId = "_copy-receiver-" + randomString();

function randomString() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function copy(event) {
  const elem = event.currentTarget, // or this?
    sourceId = elem.getAttribute("data-target"),
    source = document.getElementById(sourceId),
    isInput = source.tagName === "INPUT" || source.tagName === "TEXTAREA";

  let origSelectionStart, origSelectionEnd, receiverElement;
  if (isInput) {
    // can just use the original source element for the selection and copy
    receiverElement = source;
    origSelectionStart = source.selectionStart;
    origSelectionEnd = source.selectionEnd;
  } else {
    // must use a temporary form element for the selection and copy
    receiverElement = document.getElementById(copyReceiverId);
    if (!receiverElement) {
      // create hidden text element, if it doesn't already exist
      receiverElement = document.createElement("textarea");
      receiverElement.style.position = "absolute";
      receiverElement.style.left = "-9999px";
      receiverElement.style.top = "0";
      receiverElement.id = copyReceiverId;
      document.body.appendChild(receiverElement);
    }
    receiverElement.textContent = source.textContent;
  }

  // select the content
  const currentFocus = document.activeElement;
  receiverElement.focus();
  receiverElement.setSelectionRange(0, receiverElement.value.length);

  // copy the selection
  let success;
  try {
    success = document.execCommand("copy");
    if (success) {
      source.classList.add("copy-to-clipboard-flash-bg");
      setTimeout(() => {
        source.classList.remove("copy-to-clipboard-flash-bg");
      }, 1000);
    }
  } catch (e) {
    success = false;
  }

  // restore original focus
  if (currentFocus && typeof currentFocus.focus === "function") {
    currentFocus.focus();
  }

  if (isInput) {
    // restore prior selection
    receiverElement.setSelectionRange(origSelectionStart, origSelectionEnd);
  } else {
    // clear temporary content
    receiverElement.textContent = "";
  }
  return success;
}

module.exports = {
  copy
};
