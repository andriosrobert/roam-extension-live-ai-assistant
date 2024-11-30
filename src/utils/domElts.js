// import React from "react";
import ReactDOM from "react-dom";
import InstantButtons from "../components/InstantButtons";
import { isComponentVisible } from "..";
import { getSpeechRecognitionAPI } from "../audio/audio";
import App from "../App";
import TokensDialog from "../components/TokensDisplay";

export function mountComponent(position, props) {
  let currentBlockUid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
  let container = document.querySelector(
    `.speech-to-roam-container-${position}`
  );

  if (!container) {
    createContainer(position);
    return mountComponent(position);
  }
  if (!props) {
    props = {};
    // props.transcribeOnly = isTranslateIconDisplayed ? false : true;
  }
  // No access to microphone in mobile App and desktop App on MacOs
  // so speech-to-roam doesn't work at all in this context
  props.worksOnPlatform =
    (window.roamAlphaAPI.platform.isDesktop &&
      !window.roamAlphaAPI.platform.isPC) ||
    window.roamAlphaAPI.platform.isMobileApp
      ? false
      : true;

  // Web API speech recognition doesn't work on Electron app nor Firefox nor Arc browser
  props.position = position;
  props.mic =
    !window.roamAlphaAPI.platform.isDesktop &&
    navigator.userAgent.indexOf("Firefox") === -1 &&
    !getComputedStyle(document.documentElement).getPropertyValue(
      "--arc-palette-background"
    ) // specific to Arc browser
      ? getSpeechRecognitionAPI()
      : null;

  // isSafari = true;

  ReactDOM.render(
    <App
      blockUid={currentBlockUid}
      isVisible={isComponentVisible}
      {...props}
    />,
    container
  );
}

export function unmountComponent(position) {
  const node = document.querySelector(`.speech-to-roam-container-${position}`);
  if (node) ReactDOM.unmountComponentAtNode(node);
}

export function toggleComponentVisibility() {
  let componentElt = document.getElementsByClassName("speech-to-roam")[0];
  if (!componentElt) return;
  componentElt.style.display === "none"
    ? (componentElt.style.display = "inherit")
    : (componentElt.style.display = "none");
}

export function simulateClickOnRecordingButton() {
  const button = document.getElementsByClassName("speech-record-button")[0];
  if (
    !isComponentVisible &&
    document.getElementsByClassName("speech-to-roam")[0]?.style.display ===
      "none"
  ) {
    toggleComponentVisibility();
    if (position === "left") window.roamAlphaAPI.ui.leftSidebar.open();
  }
  if (button) {
    button.focus();
    button.click();
  }
}

export function createContainer(position) {
  const rootPosition =
    position === "top"
      ? document.querySelector(".rm-topbar")
      : document.querySelector(".roam-sidebar-content");
  const newElt = document.createElement("span");
  position === "left" && newElt.classList.add("log-button");
  newElt.classList.add(
    "speech-to-roam",
    `speech-to-roam-container-${position}`
  );
  const todayTomorrowExtension = document.querySelector("#todayTomorrow");
  if (todayTomorrowExtension && position === "top")
    todayTomorrowExtension.insertAdjacentElement("afterend", newElt);
  else
    rootPosition.insertBefore(
      newElt,
      position === "top"
        ? rootPosition.firstChild
        : document.querySelector(".rm-left-sidebar__daily-notes").nextSibling
    );
}

export function removeContainer(position) {
  const container = document.querySelector(
    `.speech-to-roam-container-${position}`
  );
  if (container) container.remove();
}

export const displaySpinner = async (targetUid) => {
  let targetBlockElt, spinner, intervalId;
  setTimeout(() => {
    targetBlockElt = document.querySelector(`[id*="${targetUid}"]`);
    if (targetBlockElt.tagName.toLowerCase() === "textarea") {
      targetBlockElt = targetBlockElt.parentElement;
    }
    const previousSpinner = targetBlockElt.querySelector(".speech-spinner");
    if (previousSpinner) previousSpinner.remove();
    spinner = document.createElement("strong");
    spinner.classList.add("speech-spinner");
    if (targetBlockElt) targetBlockElt.appendChild(spinner);
    intervalId = setInterval(() => {
      updateSpinnerText(spinner, [" .", " ..", " ...", " "]);
    }, 600);
  }, 100);
  return intervalId;

  function updateSpinnerText(container, frames) {
    const currentIndex = frames.indexOf(container.innerText);
    const nextIndex = currentIndex + 1 < frames.length ? currentIndex + 1 : 0;
    container.innerText = frames[nextIndex];
  }
};

export const removeSpinner = (intervalId) => {
  clearInterval(intervalId);
  const spinner = document.querySelector(".speech-spinner");
  if (spinner) spinner.remove();
};

export const insertParagraphForStream = (targetUid) => {
  let targetBlockElt = document.querySelector(`[id*="${targetUid}"]`);
  const previousStreamElt = targetBlockElt.querySelector(".speech-stream");
  if (previousStreamElt) previousStreamElt.remove();
  const streamElt = document.createElement("p");
  streamElt.classList.add("speech-stream");
  if (targetBlockElt) targetBlockElt.appendChild(streamElt);
  displaySpinner(targetUid);
  return streamElt;
};

export const insertInstantButtons = (props) => {
  const targetBlockElt = document.querySelector(`[id*="${props.targetUid}"]`);
  const previousContainer =
    targetBlockElt &&
    targetBlockElt.parentElement.querySelector(".speech-instant-container");
  let container;
  if (previousContainer) {
    ReactDOM.unmountComponentAtNode(previousContainer);
    // container = previousContainer;
  }
  // else {
  container = document.createElement("div");
  container.classList.add("speech-instant-container");
  // targetBlockElt.insertAdjacentElement("afterend", container);
  targetBlockElt.parentElement.appendChild(container);
  // }
  ReactDOM.render(<InstantButtons {...props} />, container);
};

export const displayTokensDialog = () => {
  const targetElt = document.querySelector(".roam-body");
  const previousContainer =
    targetElt &&
    targetElt.parentElement.querySelector(".tokens-dialog-container");
  let container;
  if (previousContainer) {
    ReactDOM.unmountComponentAtNode(previousContainer);
  }
  container = document.createElement("div");
  container.classList.add("tokens-dialog-container");
  targetElt.appendChild(container);
  function unmountTokensDialog() {
    const node = document.querySelector(".tokens-dialog-container");
    if (node) {
      ReactDOM.unmountComponentAtNode(node);
      node.remove();
    }
  }
  ReactDOM.render(
    <TokensDialog isOpen={true} onClose={unmountTokensDialog} />,
    container
  );
};
