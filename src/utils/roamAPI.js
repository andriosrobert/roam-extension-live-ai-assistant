import { copyTreeBranches } from "../ai/responseInsertion";
import { sliceByWordLimit } from "./dataProcessing";
import {
  dateStringRegex,
  dnpUidRegex,
  flexibleUidRegex,
  strictPageRegex,
  uidRegex,
} from "./regex";

export function getTreeByUid(uid) {
  if (uid)
    return window.roamAlphaAPI.q(`[:find (pull ?page
                     [:block/uid :block/string :block/children :block/refs :block/order :block/open :block/heading :children/view-type
                        {:block/children ...} ])
                      :where [?page :block/uid "${uid}"]  ]`)[0];
  else return null;
}

export async function getFirstLevelBlocksInCurrentView() {
  let zoomUid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  if (!zoomUid) return null;
  return getOrderedDirectChildren(zoomUid);
}

function getOrderedDirectChildren(uid) {
  if (!uid) return null;
  let result = window.roamAlphaAPI.q(`[:find (pull ?page
                      [:block/uid :block/string :block/children :block/order
                         {:block/children  ...} ])
                       :where [?page :block/uid "${uid}"] ]`)[0][0];
  if (!result.children) {
    return null;
  }
  return result.children
    .sort((a, b) => a.order - b.order)
    .map((block) => ({
      string: block.string,
      uid: block.uid,
      order: block.order,
    }));
}

export function getLastTopLevelOfSeletion(selectionUids) {
  if (!selectionUids || !selectionUids.length) return null;
  let lastUid = selectionUids[0];
  let lastOrder = 0;
  const orderedChildrenTree = getOrderedDirectChildren(getParentBlock(lastUid));
  selectionUids.forEach((uid) => {
    const ordered = orderedChildrenTree.find((item) => item.uid === uid);
    if (ordered && ordered.order > lastOrder) {
      lastUid = uid;
      lastOrder = ordered.order;
    }
  });
  return lastUid;
}

export function getBlockContentByUid(uid) {
  let result = window.roamAlphaAPI.pull("[:block/string]", [":block/uid", uid]);
  if (result) return result[":block/string"];
  else return "";
}

export function getBlocksMentioningTitle(title) {
  let result = window.roamAlphaAPI.q(`[:find ?block-uid ?block-string
    :where 
    [?page :node/title "${title}"]
    [?block :block/refs ?page]
    [?block :block/uid ?block-uid]
    [?block :block/string ?block-string]]`);
  if (!result.length) return null;
  return result.map((block) => {
    return { uid: block[0], content: block[1] };
  });
}

export function getPathOfBlock(uid) {
  let result = window.roamAlphaAPI
    .q(`[:find (pull ?block [{:block/parents [:block/uid :block/string]}])
  :where
  [?block :block/uid "${uid}"]]`);
  if (!result) return null;
  return result[0][0].parents?.map((p) => {
    return { uid: p.uid, string: p.string };
  });
}

export function getFormattedPath(uid, maxWords, directParentMaxWords) {
  const path = getPathOfBlock(uid);
  if (!path) return "";
  let formattedPath = "";
  for (let i = 0; i < path.length; i++) {
    const isDirectParent = i === path.length - 1;
    formattedPath +=
      sliceByWordLimit(
        path[i].string || "",
        isDirectParent && directParentMaxWords ? maxWords : directParentMaxWords
      ) + (isDirectParent ? "" : " > ");
  }
  return formattedPath;
}

export function isExistingBlock(uid) {
  let result = window.roamAlphaAPI.pull("[:block/uid]", [":block/uid", uid]);
  if (result) return true;
  return false;
}

export function getParentBlock(uid) {
  let result = window.roamAlphaAPI.pull(
    "[:block/uid {:block/parents [:block/uid {:block/children [:block/uid]}]}]",
    [":block/uid", uid]
  );
  if (result) {
    const directParent = result[":block/parents"]?.find((parent) =>
      parent[":block/children"]?.some((child) => child[":block/uid"] === uid)
    );
    return directParent[":block/uid"];
  } else return "";
}

// export function getTopParentAmongBlocks(blockUids) {
//   let result = window.roamAlphaAPI.q(
//     `[:find ?uids
//       :in $ [?all-uids ...]
//   :where
//   [?blocks :block/uid ?all-uids]
//   [?parents :block/children ?blocks]
//   [?children :block/parents ?parents]
//   [?parents :block/uid ?uids]
//   ]`,
//     blockUids
//   );
//   let topParent;
//   for (let i = 0; i < result.length; i++) {
//     if (blockUids.includes(result[i][0])) {
//       topParent = result[i][0];
//       break;
//     }
//   }
//   return topParent;
// }

export function getPreviousSiblingBlock(currentUid) {
  const parentUid = getParentBlock(currentUid);
  const tree = getOrderedDirectChildren(parentUid);
  const currentBlockOrder = tree.find(
    (block) => block.uid === currentUid
  ).order;
  if (!currentBlockOrder) return null;
  return tree.find((block) => block.order === currentBlockOrder - 1);
}

export function getPageUidByBlockUid(uid) {
  let result = window.roamAlphaAPI.pull("[:block/uid {:block/page ...}]", [
    ":block/uid",
    uid,
  ]);
  if (result) return result[":block/page"][":block/uid"];
  else return "";
}

export function getPageUidByPageName(title) {
  let r = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", title]);
  if (r != null) return r[":block/uid"];
  else return null;
}

export async function getMainPageUid() {
  let uid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  let pageUid = window.roamAlphaAPI.pull("[{:block/page [:block/uid]}]", [
    ":block/uid",
    uid,
  ]);
  if (pageUid === null) return uid;
  return pageUid[":block/page"][":block/uid"];
}

function getPageNameByPageUid(uid) {
  let r = window.roamAlphaAPI.data.pull("[:node/title]", [":block/uid", uid]);
  if (r != null) return r[":node/title"];
  else return "undefined";
}

export function getBlockOrderByUid(uid) {
  let result = window.roamAlphaAPI.pull("[:block/order]", [":block/uid", uid]);
  if (result) return result[":block/order"];
  else return "";
}

export function getLinkedReferencesTrees(pageUid) {
  if (!pageUid) return null;
  let result = window.roamAlphaAPI.q(
    `[:find
      (pull ?node [:block/uid :block/string :edit/time :block/children
      {:block/children ...}])
  :where
    [?test-Ref :block/uid "${pageUid}"]
    [?node :block/refs ?test-Ref]
  ]`
  );
  // sorted by edit time from most recent to older
  const reverseTimeSorted = result.sort((a, b) => b[0].time - a[0].time);
  return reverseTimeSorted;
}

export async function createSiblingBlock(
  currentUid,
  position,
  content = "",
  format
) {
  const currentOrder = getBlockOrderByUid(currentUid);
  const parentUid = getParentBlock(currentUid);
  const siblingUid = await createChildBlock(
    parentUid,
    content,
    position === "before" ? currentOrder : currentOrder + 1,
    format?.open || true,
    format?.heading
  );
  return siblingUid;
}

export async function getTopOrActiveBlockUid() {
  let currentBlockUid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
  if (currentBlockUid) return currentBlockUid;
  else {
    let uid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
    if (getBlockContentByUid(uid)) return uid;
    return getFirstChildUid(uid);
  }
}

export function getFirstChildUid(uid) {
  let q = `[:find (pull ?c
                       [:block/uid :block/children {:block/children ...}])
                    :where [?c :block/uid "${uid}"]  ]`;
  let result = window.roamAlphaAPI.q(q);
  if (!result.length) return null;
  if (result[0][0].children) return result[0][0].children[0].uid;
  return null;
}

export function getFirstChildContent(uid) {
  let result = window.roamAlphaAPI.q(`[:find ?first-child-uid
    :where
    [?parent-block :block/uid "${uid}"]
    [?parent-block :block/children ?first-child]
    [?first-child :block/order 0]
    [?first-child :block/uid ?first-child-uid]]`);
  if (!result.length) return null;
  return result[0][0];
}

export function focusOnBlockInMainWindow(blockUid) {
  window.roamAlphaAPI.ui.setBlockFocusAndSelection({
    location: {
      "block-uid": blockUid,
      "window-id": "main-window",
    },
  });
}

export async function updateBlock({
  blockUid,
  newContent = undefined,
  format = {},
}) {
  await window.roamAlphaAPI.updateBlock({
    block: {
      uid: blockUid,
      string: newContent,
      ...format,
    },
  });
}

export function updateArrayOfBlocks(arrayOfBlocks, mode) {
  if (arrayOfBlocks.length) {
    arrayOfBlocks.forEach((block) => {
      const uid = block.uid.replaceAll("(", "").replaceAll(")", "").trim();
      window.roamAlphaAPI.updateBlock({
        block: {
          uid: uid,
          string:
            mode === "append"
              ? getBlockContentByUid(uid).trim() + " " + block.content.trim()
              : block.content,
        },
      });
    });
  }
}

export function moveBlock({ blockUid, targetParentUid, order }) {
  window.roamAlphaAPI.moveBlock({
    location: { "parent-uid": targetParentUid, order: order || "last" },
    block: { uid: blockUid },
  });
}

export async function deleteBlock(blockUid) {
  await window.roamAlphaAPI.deleteBlock({ block: { uid: blockUid } });
}

export function reorderBlocks({ parentUid, newOrder }) {
  console.log("parentUid :>> ", parentUid);
  window.roamAlphaAPI.data.block.reorderBlocks({
    location: { "parent-uid": parentUid },
    blocks: newOrder,
  });
}

export async function createChildBlock(
  parentUid,
  content = "",
  order = "last",
  open = true,
  heading = 0,
  viewType = "bullet",
  uid
) {
  if (!uid) uid = window.roamAlphaAPI.util.generateUID();
  await window.roamAlphaAPI.createBlock({
    location: { "parent-uid": parentUid, order: order },
    block: {
      string: content,
      uid: uid,
      open: open,
      heading: heading,
      "children-view-type": viewType,
    },
  });
  return uid;
}

const deleteChildren = async (parentUid) => {
  const directChildren = getOrderedDirectChildren(parentUid);
  console.log("directChildren :>> ", directChildren);
  if (directChildren) {
    await Promise.all(
      directChildren.map(async (child) => await deleteBlock(child.uid))
    );
  }
};

export const replaceChildrenByNewTree = async (
  parentUid,
  newTree,
  isClone = false
) => {
  await deleteChildren(parentUid);
  await copyTreeBranches(newTree, parentUid, 99, null, isClone);
};

export async function insertBlockInCurrentView(content, order) {
  let zoomUid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  // If not on a given page, but in Daily Log
  if (!zoomUid) {
    zoomUid = window.roamAlphaAPI.util.dateToPageUid(new Date());
    // TODO : send a message "Added on DNP page"
  }
  const newUid = window.roamAlphaAPI.util.generateUID();
  window.roamAlphaAPI.createBlock({
    location: {
      "parent-uid": zoomUid,
      order: order === "first" || order === 0 ? 0 : "last",
    },
    block: {
      string: content,
      uid: newUid,
    },
  });
  return newUid;
}

export async function addContentToBlock(uid, contentToAdd, format = {}) {
  const currentContent = getBlockContentByUid(uid).trimEnd();
  // currentContent += currentContent ? " " : "";
  await window.roamAlphaAPI.updateBlock({
    block: {
      uid: uid,
      string: (currentContent ? currentContent + " " : "") + contentToAdd,
      ...format,
    },
  });
}

export const getBlocksSelectionUids = (reverse) => {
  let selectedBlocksUids = [];
  let blueSelection = !reverse
    ? document.querySelectorAll(".block-highlight-blue")
    : document.querySelectorAll(".rm-block-main");
  let checkSelection = roamAlphaAPI.ui.individualMultiselect.getSelectedUids();
  if (blueSelection.length === 0) blueSelection = null;
  if (blueSelection) {
    blueSelection.forEach((node) => {
      let inputBlock = node.querySelector(".rm-block__input");
      if (!inputBlock) return;
      const uid = inputBlock.id.slice(-9);
      if (!selectedBlocksUids.includes(uid)) selectedBlocksUids.push(uid);
    });
  } else if (checkSelection.length !== 0) {
    selectedBlocksUids = checkSelection;
  }
  return selectedBlocksUids;
};

export const getReferencesCitation = (blockUids) => {
  let citation = "";
  if (blockUids.length > 0) {
    blockUids.forEach(
      (uid, index) =>
        (citation += ` [${index}](((${uid})))${
          index < blockUids.length - 1 ? "," : ""
        }`)
    );
    return "blocks used as context:" + citation;
  }
  return "";
};

export const resolveReferences = (content, refsArray = [], once = false) => {
  uidRegex.lastIndex = 0;
  if (uidRegex.test(content)) {
    uidRegex.lastIndex = 0;
    let matches = content.matchAll(uidRegex);
    for (const match of matches) {
      let refUid = match[0].slice(2, -2);
      // prevent infinite loop !
      let isNewRef = !refsArray.includes(refUid);
      refsArray.push(refUid);
      let resolvedRef = getBlockContentByUid(refUid);
      uidRegex.lastIndex = 0;
      if (uidRegex.test(resolvedRef) && isNewRef && !once)
        resolvedRef = resolveReferences(resolvedRef, refsArray);
      content = content.replace(match, resolvedRef);
    }
  }
  return content;
};

export const isLogView = () => {
  if (document.querySelector("#rm-log-container")) return true;
  return false;
};

export const isCurrentPageDNP = async () => {
  const pageUid = await getMainPageUid();
  return dateStringRegex.test(pageUid);
};

export const getDNPTitleFromDate = (date) => {
  return window.roamAlphaAPI.util.dateToPageTitle(date);
};

const getYesterdayDate = (date = null) => {
  if (!date) date = new Date();
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
};

export const getDateStringFromDnpUid = (dnpUid) => {
  const parts = dnpUid.split("-");
  const date = new Date(parts[2], parts[0] - 1, parts[1]);
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedDate = formatter.format(date);
  return formattedDate;
};

export const extractNormalizedUidFromRef = (str, testIfExist = true) => {
  if (!str || (str && !(str.length === 9 || str.length === 13))) return "";
  const matchingResult = str.match(flexibleUidRegex);
  if (!matchingResult) return "";
  return testIfExist
    ? isExistingBlock(matchingResult[1])
      ? matchingResult[1]
      : ""
    : matchingResult[1];
};

const normlizePageTitle = (str) => {
  if (strictPageRegex.test(str)) return str.slice(2, -2);
  else return str;
};

// only used on templates to remove {text} flag
export const cleanFlagFromBlocks = (flag, blockUids) => {
  blockUids.forEach((uid) =>
    window.roamAlphaAPI.updateBlock({
      block: {
        uid: uid,
        string: getBlockContentByUid(uid).replace(flag, "").trim(),
      },
    })
  );
};

const getAdaptativeQueryStrings = (
  withExcludeRegex,
  pageRegex,
  nbOfRegex,
  onlySiblings,
  matchingParents
) => {
  let regexVarStr = "";
  let findStr = "";
  let resultStr = "";
  let excludeRegexVar = "";
  let excludeStr = "";
  let findSiblingsStr = "";
  let parentStr = "";
  if (nbOfRegex) {
    for (let i = 0; i < nbOfRegex; i++) {
      resultStr += `?child-uid${i} ?child-content${i} `;
      regexVarStr += `?regex${i} `;
      if (!onlySiblings) {
        findStr += `
        [(re-pattern ?regex${i}) ?pattern${i}]
        (descendants ?b ?child${i})
        [?child${i} :block/uid ?child-uid${i}]
        [?child${i} :block/string ?child-content${i}]
        (or
          [(re-find ?pattern${i} ?child-content${i})]
          [(re-find ?pattern${i} ?content)])\n`;
      } else if (i > 1) {
        findSiblingsStr += `[?parents :block/children ?child${i}]
    [?child${i} :block/string ?child-content${i}]
    [(not= ?child${i - 1} ?child${i})]
    [(re-pattern ?regex${i}) ?pattern${i}]
    [(re-find ?pattern${i} ?child-content${i})]
    [?child${i} :block/uid ?child-uid${i}]\n`;
      }
    }
  }
  const pageStr = pageRegex
    ? pageRegex === "dnp"
      ? `[?page :block/uid ?page-uid]
    [(re-pattern "${dnpUidRegex.source.slice(1, -1)}") ?page-regex]
[(re-find ?page-regex ?page-uid)]`
      : `[(re-pattern "${pageRegex}") ?page-regex]
[(re-find ?page-regex ?page-title)]`
    : "";

  if (withExcludeRegex) {
    excludeRegexVar = "?regex-not";
    excludeStr = "[(re-pattern ?regex-not) ?pattern-not]";
  }

  if (matchingParents) {
    parentStr = `\n[?matching-parents :block/uid ?matching-parents-uid]
    (descendants ?matching-parents ?b)`;
  }

  return {
    resultStr,
    regexVarStr,
    findStr,
    pageStr,
    excludeRegexVar,
    excludeStr,
    findSiblingsStr,
    parentStr,
  };
};

export const getBlocksMatchingRegexQuery = (
  withExcludeRegex,
  pageRegex,
  matchingParents
) => {
  const { parentStr, pageStr, excludeRegexVar, excludeStr } =
    getAdaptativeQueryStrings(
      withExcludeRegex,
      pageRegex,
      null,
      null,
      matchingParents
    );

  const q = `[:find ?uid ?content ?time ?page-title
    :in $ ${
      matchingParents ? "% [?matching-parents-uid ...] " : ""
    }?regex ${excludeRegexVar}
    :where ${parentStr}
    [?b :block/uid ?uid]
   [?b :block/string ?content]
   [?b :block/page ?page]
   [?page :node/title ?page-title]
   ${pageStr}
   [?b :edit/time ?time]
   [(re-pattern ?regex) ?pattern]
   [(re-find ?pattern ?content)]
   ${
     excludeStr
       ? `${excludeStr}
      (not [(re-find ?pattern-not ?content)])`
       : ""
   }]`;
  return q;
};

export const descendantRule = `[[(descendants ?parent ?child)
  [?parent :block/children ?child]]
  [(descendants ?descendant ?child)
  [?parent :block/children ?child]
  (descendants ?descendant ?parent)]]]`;

export const getMultipleMatchingRegexInTreeQuery = (
  nbOfRegex,
  withExcludeRegex,
  pageRegex
) => {
  const {
    resultStr,
    regexVarStr,
    findStr,
    pageStr,
    excludeRegexVar,
    excludeStr,
  } = getAdaptativeQueryStrings(withExcludeRegex, pageRegex, nbOfRegex);

  const q = `[:find ?matching-b ?content ?time ?page-title ${resultStr}
    :in $ % [?matching-b ...] ${regexVarStr} ${excludeRegexVar}
    
    :where
    [?b :block/uid ?matching-b]
    [?b :block/string ?content]
    [?b :block/page ?page]
    [?page :node/title ?page-title]
    ${pageStr}
    [?b :edit/time ?time]
    ${
      excludeStr
        ? `${excludeStr}
      [?b :block/children ?direct-child]
      [?direct-child :block/string ?child-content]
      (not [(re-find ?pattern-not ?content)])
      (not [(re-find ?pattern-not ?child-content)])`
        : ""
    }
    ${findStr}
    ]`;
  return q;
};

export const getSiblingsParentMatchingRegexQuery = (
  nbOfRegex,
  withExcludeRegex,
  pageRegex
) => {
  const {
    resultStr,
    regexVarStr,
    findStr,
    pageStr,
    excludeRegexVar,
    excludeStr,
    findSiblingsStr,
  } = getAdaptativeQueryStrings(withExcludeRegex, pageRegex, nbOfRegex, true);

  const q = `[:find ?parent-uid ?parent-content ?time ?page-title ${resultStr}
  :in $ [?matching-b ...] ${regexVarStr} ${excludeRegexVar}
  :where
    [?b :block/uid ?matching-b]
    [?b :block/page ?page]
    [?page :node/title ?page-title]
    ${pageStr}
    [?parents :block/children ?b]
    [?parents :block/children ?child0]
    [?parents :block/children ?child1]
    [?child0 :block/string ?child-content0]
    [?child1 :block/string ?child-content1]
    [(not= ?child0 ?child1)]
    ${
      excludeStr
        ? `${excludeStr}
      (not [?parents :block/children ?any-child]
      [?any-child :block/string ?any-content]
      [(re-find ?pattern-not ?any-content)])`
        : ""
    }
    [(re-pattern ?regex0) ?pattern0]
    [(re-pattern ?regex1) ?pattern1]
    [(re-find ?pattern0 ?child-content0)]
    [(re-find ?pattern1 ?child-content1)]
    ${findSiblingsStr}
    [?child0 :block/uid ?child-uid0]
    [?child1 :block/uid ?child-uid1]
    [?parents :block/uid ?parent-uid]
    [?parents :block/string ?parent-content]
    [?parents :edit/time ?time]
    ]`;
  return q;
};
